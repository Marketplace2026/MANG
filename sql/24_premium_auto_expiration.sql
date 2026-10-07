-- ============================================================
-- MANG — EXPIRATION AUTOMATIQUE DU STATUT PREMIUM (30 JOURS)
-- Exécutez ce script dans l'éditeur SQL de Supabase
-- ============================================================

-- 1. Fonction de purge et rétrogradation automatique des boutiques expirées
CREATE OR REPLACE FUNCTION expire_outdated_premiums()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE shops
  SET premium_level = 0
  WHERE premium_level > 0
    AND premium_expires_at IS NOT NULL
    AND premium_expires_at <= NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION expire_outdated_premiums() TO authenticated, anon;

-- 2. Index pour accélérer la recherche des abonnements expirés
CREATE INDEX IF NOT EXISTS idx_shops_premium_expiration ON shops(premium_expires_at) WHERE premium_level > 0;
CREATE INDEX IF NOT EXISTS idx_premium_subs_expiration ON premium_subscriptions(expires_at, user_id);
