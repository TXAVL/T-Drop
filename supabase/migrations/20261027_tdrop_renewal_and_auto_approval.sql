-- T-Drop: renewal (stacks onto the existing key) + SePay auto-approval.
-- Additive only: existing tables keep their columns, existing grants are untouched.
-- admin_approve_order keeps its signature and grants; it now delegates to
-- tdrop_fulfill_order so manual and automatic approval behave identically.

alter table public.tdrop_orders add column if not exists renew_key text;
alter table public.tdrop_orders add column if not exists paid_amount integer;
alter table public.tdrop_orders add column if not exists payment_ref text;
alter table public.tdrop_orders add column if not exists emailed_at timestamptz;

-- Every webhook delivery is logged; the SePay transaction id makes retries idempotent.
create table if not exists public.tdrop_payments (
  id bigint primary key,
  gateway text,
  amount integer,
  content text,
  reference_code text,
  order_code text,
  result text,
  raw jsonb,
  received_at timestamptz not null default now()
);
alter table public.tdrop_payments enable row level security;
revoke all on public.tdrop_payments from anon, authenticated;

-- Same hardware rule activate_tdrop_license uses (hash, prefix, or key segment).
create or replace function public.tdrop_license_matches_machine(p_key text, p_hardware_id text, p_machine text)
returns boolean language sql immutable as $$
  select coalesce(
    upper(trim(p_hardware_id)) = upper(trim(p_machine))
    or upper(trim(p_hardware_id)) like upper(trim(p_machine)) || '%'
    or split_part(upper(trim(p_key)), '_', 2) = upper(trim(p_machine)),
  false)
$$;

-- Single source of truth for turning a paid order into a license.
-- New purchase: mint a key. Renewal: extend the existing key (days stack).
create or replace function public.tdrop_fulfill_order(p_order_code text, p_paid_amount integer default null, p_payment_ref text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.tdrop_orders%rowtype;
  v_lic public.tdrop_licenses%rowtype;
  v_key text;
  v_days interval;
  v_expires timestamptz;
  v_renewed boolean := false;
begin
  select * into v_order from public.tdrop_orders where order_code = p_order_code for update;
  if not found then
    return jsonb_build_object('ok', false, 'message', 'Không tìm thấy đơn hàng: ' || p_order_code);
  end if;

  if v_order.status = 'approved' and v_order.license_key is not null then
    return jsonb_build_object(
      'ok', true, 'already_approved', true, 'order_code', v_order.order_code,
      'license_key', v_order.license_key, 'email', v_order.email, 'machine_id', v_order.machine_id,
      'role', v_order.role, 'renewed', v_order.renew_key is not null,
      'message', 'Đơn hàng này đã được duyệt trước đó');
  end if;

  v_days := case when v_order.role = 'PREMIUM' then interval '60 days' else interval '30 days' end;

  -- 1. Ưu tiên 1: Đơn hàng chỉ định renew_key cụ thể -> CỘNG DỒN ngày vào key đó (bất kể machine_id)
  if v_order.renew_key is not null and trim(v_order.renew_key) <> '' then
    select * into v_lic from public.tdrop_licenses
      where upper(trim(key)) = upper(trim(v_order.renew_key)) for update;
    if found and v_lic.status = 'active' and v_lic.role <> 'MASTER' then
      v_expires := greatest(coalesce(v_lic.expires_at, now()), now()) + v_days;
      update public.tdrop_licenses
        set expires_at = v_expires,
            role = case when v_lic.role = 'PREMIUM' or v_order.role = 'PREMIUM' then 'PREMIUM' else 'VIP' end,
            user_email = coalesce(nullif(trim(v_order.email), ''), v_lic.user_email),
            hardware_id = coalesce(nullif(trim(v_order.machine_id), ''), v_lic.hardware_id),
            note = trim(coalesce(note, '') || ' | Renew ' || v_order.order_code),
            updated_at = now()
        where id = v_lic.id;
      v_key := v_lic.key;
      v_renewed := true;
    end if;
  end if;

  -- 2. Ưu tiên 2: Đơn gia hạn nhưng không tìm thấy theo renew_key hoặc chuyển khoản ghi 'GIA HAN' -> tìm license active để cộng dồn
  if v_key is null and (v_order.transfer_content ilike '%GIA HAN%' or (v_order.renew_key is not null and trim(v_order.renew_key) <> '')) then
    select * into v_lic from public.tdrop_licenses
      where status = 'active' and role <> 'MASTER'
        and (
          upper(trim(hardware_id)) = upper(trim(v_order.machine_id))
          or split_part(upper(trim(key)), '_', 2) = upper(trim(v_order.machine_id))
          or (v_order.email is not null and trim(v_order.email) <> '' and lower(trim(user_email)) = lower(trim(v_order.email)))
        )
      order by expires_at desc nulls last limit 1 for update;
    if found then
      v_expires := greatest(coalesce(v_lic.expires_at, now()), now()) + v_days;
      update public.tdrop_licenses
        set expires_at = v_expires,
            role = case when v_lic.role = 'PREMIUM' or v_order.role = 'PREMIUM' then 'PREMIUM' else 'VIP' end,
            user_email = coalesce(nullif(trim(v_order.email), ''), v_lic.user_email),
            hardware_id = coalesce(nullif(trim(v_order.machine_id), ''), v_lic.hardware_id),
            note = trim(coalesce(note, '') || ' | Renew ' || v_order.order_code),
            updated_at = now()
        where id = v_lic.id;
      v_key := v_lic.key;
      v_renewed := true;
    end if;
  end if;

  -- 3. Mua mới -> Tạo key mới
  if v_key is null then
    v_key := public.create_tdrop_license_key(v_order.machine_id, v_order.role, coalesce(v_order.email, 'Khách hàng'), 'Order ' || v_order.order_code);
    update public.tdrop_licenses set user_email = v_order.email where key = v_key;
    select expires_at into v_expires from public.tdrop_licenses where key = v_key;
  end if;

  update public.tdrop_orders
    set status = 'approved', license_key = v_key, approved_at = now(),
        paid_amount = coalesce(p_paid_amount, paid_amount),
        payment_ref = coalesce(p_payment_ref, payment_ref)
    where id = v_order.id;

  return jsonb_build_object(
    'ok', true, 'order_code', v_order.order_code, 'license_key', v_key, 'email', v_order.email,
    'machine_id', v_order.machine_id, 'role', v_order.role, 'renewed', v_renewed,
    'expires_at', v_expires,
    'message', case when v_renewed then 'Gia hạn thành công!' else 'Duyệt thành công và đã tạo mã bản quyền!' end);
end;
$$;
revoke all on function public.tdrop_fulfill_order(text, integer, text) from public, anon, authenticated;
grant execute on function public.tdrop_fulfill_order(text, integer, text) to service_role;

-- Manual approval from the admin portal: same signature, now renewal-aware.
create or replace function public.admin_approve_order(p_pin text, p_order_code text)
returns jsonb
language plpgsql
security definer
as $$
begin
  if not public.verify_admin_pin(p_pin) then
    return jsonb_build_object('ok', false, 'message', 'Mã PIN Admin không chính xác');
  end if;
  return public.tdrop_fulfill_order(p_order_code, null, 'manual');
end;
$$;

-- App: prefill the renewal form.
create or replace function public.tdrop_renewal_info(p_key text, p_hw_hash text)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_lic public.tdrop_licenses%rowtype;
  v_email text;
begin
  select * into v_lic from public.tdrop_licenses where upper(trim(key)) = upper(trim(p_key));
  if not found or v_lic.status <> 'active' then
    return jsonb_build_object('ok', false);
  end if;
  v_email := nullif(trim(v_lic.user_email), '');
  if v_email is null then
    select email into v_email from public.tdrop_orders
      where (upper(license_key) = upper(v_lic.key) or upper(machine_id) = upper(trim(p_hw_hash)))
        and email is not null
      order by created_at desc limit 1;
  end if;
  return jsonb_build_object('ok', true, 'email', v_email, 'role', v_lic.role,
                            'expires_at', v_lic.expires_at, 'status', v_lic.status);
end;
$$;
grant execute on function public.tdrop_renewal_info(text, text) to anon, authenticated;

-- App: poll an order it created. The key is only returned to the machine that ordered it.
create or replace function public.tdrop_order_status(p_order_code text, p_machine_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_order public.tdrop_orders%rowtype;
  v_expires timestamptz;
begin
  select * into v_order from public.tdrop_orders
    where order_code = p_order_code and upper(machine_id) = upper(trim(p_machine_id));
  if not found then
    return jsonb_build_object('ok', false, 'status', 'not_found');
  end if;
  if v_order.status = 'approved' then
    select expires_at into v_expires from public.tdrop_licenses where key = v_order.license_key;
  end if;
  return jsonb_build_object('ok', true, 'status', v_order.status,
    'license_key', case when v_order.status = 'approved' then v_order.license_key end,
    'renewed', v_order.renew_key is not null,
    'expires_at', v_expires);
end;
$$;
grant execute on function public.tdrop_order_status(text, text) to anon, authenticated;
