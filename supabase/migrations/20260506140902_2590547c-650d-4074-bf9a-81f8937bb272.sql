
-- Revoke public execute on security definer functions
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_role(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;
