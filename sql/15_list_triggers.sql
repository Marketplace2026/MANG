-- ============================================================
-- SQL UTILITY : OBTENIR LA LISTE DES TRIGGERS SUR AUTH.USERS
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_auth_triggers()
RETURNS TABLE (
  tg_name TEXT,
  tg_type INT2,
  tg_func TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.tgname::TEXT,
    t.tgtype,
    p.proname::TEXT
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  JOIN pg_proc p ON t.tgfoid = p.oid
  WHERE n.nspname = 'auth' AND c.relname = 'users';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
