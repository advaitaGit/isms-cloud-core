
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_system_owner() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_org_admin() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.current_org() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.user_org(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.org_is_active(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.enforce_seat_limit() FROM anon, public, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_system_owner() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_org() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_org(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.org_is_active(uuid) TO authenticated;
CREATE POLICY "invites service only" ON public.invites FOR SELECT TO authenticated USING (public.is_system_owner());
