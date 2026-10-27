-- T-Drop security lockdown: no more admin PIN — admin = an account with
-- role 'admin' in txa_web_users, proven by a session token issued at login.
--
-- Before: verify_admin_pin() returned true for everyone and the admin RPCs were
-- callable with the public anon key, so anyone could mint/revoke licenses,
-- read every order (emails + keys) and promote themselves to admin.
--
-- Website change required (one line): keep `session_token` from txa_web_login
-- and pass it as `p_pin` to the T-Drop admin RPCs.

-- ── Sessions ────────────────────────────────────────────────────────────────
create table if not exists public.txa_web_sessions (
  token_hash text primary key,
  user_id uuid not null references public.txa_web_users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days'
);
create index if not exists txa_web_sessions_user_idx on public.txa_web_sessions(user_id);
alter table public.txa_web_sessions enable row level security;
revoke all on public.txa_web_sessions from anon, authenticated;

-- Login now also returns a session token (additive: existing fields unchanged).
create or replace function public.txa_web_login(p_email text, p_password text)
returns jsonb
language plpgsql
security definer
as $function$
declare
    v_clean_email text;
    v_user record;
    v_token text;
begin
    v_clean_email := lower(trim(p_email));

    select id, email, password_hash, display_name, avatar_url, role, created_at
    into v_user
    from public.txa_web_users
    where email = v_clean_email;

    if not found then
        return jsonb_build_object('success', false, 'error', 'Tài khoản hoặc mật khẩu không chính xác.');
    end if;

    if v_user.password_hash = crypt(p_password, v_user.password_hash) then
        v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
        delete from public.txa_web_sessions where user_id = v_user.id and expires_at < now();
        insert into public.txa_web_sessions (token_hash, user_id)
        values (encode(sha256(convert_to(v_token, 'UTF8')), 'hex'), v_user.id);

        return jsonb_build_object(
            'success', true,
            'session_token', v_token,
            'user', jsonb_build_object(
                'id', v_user.id,
                'email', v_user.email,
                'display_name', v_user.display_name,
                'role', v_user.role,
                'avatar_url', v_user.avatar_url,
                'created_at', v_user.created_at
            )
        );
    else
        return jsonb_build_object('success', false, 'error', 'Tài khoản hoặc mật khẩu không chính xác.');
    end if;
end;
$function$;

create or replace function public.txa_web_logout(p_token text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  with d as (
    delete from public.txa_web_sessions
    where token_hash = encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex')
    returning 1
  )
  select jsonb_build_object('success', true, 'revoked', (select count(*) from d))
$$;
grant execute on function public.txa_web_logout(text) to anon, authenticated;

-- The T-Drop admin RPCs all start with verify_admin_pin(p_pin). It now means
-- "p_pin is a live session token of an account whose role is currently admin".
create or replace function public.verify_admin_pin(p_pin text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.txa_web_sessions s
    join public.txa_web_users u on u.id = s.user_id
    where s.token_hash = encode(sha256(convert_to(coalesce(p_pin, ''), 'UTF8')), 'hex')
      and s.expires_at > now()
      and u.role = 'admin'
  )
$$;

-- ── Close the bypasses ──────────────────────────────────────────────────────
-- PIN-less overloads skipped the check entirely.
revoke execute on function public.admin_approve_order(text) from public, anon, authenticated;
revoke execute on function public.admin_list_orders(text) from public, anon, authenticated;
revoke execute on function public.admin_list_licenses(text, text) from public, anon, authenticated;
revoke execute on function public.admin_revoke_license(text) from public, anon, authenticated;
revoke execute on function public.admin_create_tdrop_license(text, text, text) from public, anon, authenticated;

-- Minting a key directly must go through an approved order or an admin.
revoke execute on function public.create_tdrop_license_key(text, text, text, text) from public, anon, authenticated;
grant execute on function public.create_tdrop_license_key(text, text, text, text) to service_role;

-- Anyone could make any account admin. Promote from the Supabase dashboard instead.
revoke execute on function public.txa_promote_to_admin(text) from public, anon, authenticated;
grant execute on function public.txa_promote_to_admin(text) to service_role;

-- ── Orders: no more public reading of emails and keys ───────────────────────
-- The app (<= v0.1.10) inserts with Prefer: return=representation, which needs the
-- new row to be readable. Allow only a just-created pending row, for 30 seconds.
-- v0.1.11+ uses return=minimal and polls via tdrop_order_status() instead.
drop policy if exists "Allow public select tdrop_orders" on public.tdrop_orders;
drop policy if exists "Read own just-created pending order" on public.tdrop_orders;
create policy "Read own just-created pending order" on public.tdrop_orders
  for select to anon, authenticated
  using (status = 'pending' and created_at > now() - interval '30 seconds');

-- New orders always start pending and unpaid, whatever the client sends.
drop policy if exists "Allow public insert tdrop_orders" on public.tdrop_orders;
create policy "Allow public insert tdrop_orders" on public.tdrop_orders
  for insert to anon, authenticated
  with check (status = 'pending' and license_key is null and approved_at is null
              and paid_amount is null and payment_ref is null);
