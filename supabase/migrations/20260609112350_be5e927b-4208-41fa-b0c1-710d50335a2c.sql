
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.owns_project(UUID) FROM PUBLIC, anon;
-- owns_project is used inside RLS policies, which run with definer privileges,
-- so revoking from authenticated does not break them; keep an explicit grant only to service_role.
GRANT EXECUTE ON FUNCTION public.owns_project(UUID) TO service_role;
