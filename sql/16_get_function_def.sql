-- ============================================================
-- SQL UTILITY : OBTENIR LA DÉFINITION DE HANDLE_NEW_USER
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_function_def()
RETURNS TEXT AS $$
BEGIN
  RETURN pg_get_functiondef('public.handle_new_user()'::regprocedure);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
