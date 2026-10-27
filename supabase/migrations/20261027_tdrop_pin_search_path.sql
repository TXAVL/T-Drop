-- Pin search_path on the T-Drop SECURITY DEFINER functions (advisor: function_search_path_mutable).
-- txa_web_login is left alone: it calls pgcrypto's crypt() from the extensions schema.
alter function public.tdrop_license_matches_machine(text, text, text) set search_path = public, pg_temp;
alter function public.create_tdrop_license_key(text, text, text, text) set search_path = public, pg_temp;
alter function public.admin_approve_order(text, text) set search_path = public, pg_temp;
alter function public.admin_approve_order(text) set search_path = public, pg_temp;
alter function public.admin_list_orders(text, text) set search_path = public, pg_temp;
alter function public.admin_list_orders(text) set search_path = public, pg_temp;
alter function public.admin_list_licenses(text, text, text) set search_path = public, pg_temp;
alter function public.admin_list_licenses(text, text) set search_path = public, pg_temp;
alter function public.admin_revoke_license(text, text) set search_path = public, pg_temp;
alter function public.admin_revoke_license(text) set search_path = public, pg_temp;
alter function public.admin_create_tdrop_license(text, text, text, text) set search_path = public, pg_temp;
alter function public.admin_create_tdrop_license(text, text, text) set search_path = public, pg_temp;
alter function public.admin_create_license(text, text, text, text) set search_path = public, pg_temp;
alter function public.txa_promote_to_admin(text) set search_path = public, pg_temp;
