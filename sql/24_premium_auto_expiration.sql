-- ============================================================
-- MANG — EXPIRATION AUTOMATIQUE DU STATUT PREMIUM (30 JOURS)
-- ET MASQUAGE DU SURPLUS DE PRODUITS HORS QUOTA (OPTION 1)
-- ============================================================

-- 1. Fonction de purge et rétrogradation automatique des boutiques expirées
CREATE OR REPLACE FUNCTION expire_outdated_premiums()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
  r RECORD;
BEGIN
  -- Identifier les boutiques expirées et mettre à jour leur niveau
  FOR r IN (
    SELECT id FROM shops
    WHERE premium_level > 0
      AND premium_expires_at IS NOT NULL
      AND premium_expires_at <= NOW()
  ) LOOP
    -- Rétrograder la boutique à 0
    UPDATE shops SET premium_level = 0 WHERE id = r.id;

    -- Conserver les 5 produits les plus récents visibles et masquer le reste
    WITH ranked_products AS (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY shop_id ORDER BY created_at DESC) as rn
      FROM products
      WHERE shop_id = r.id
    )
    UPDATE products p
    SET is_available = CASE WHEN rp.rn <= 5 THEN true ELSE false END
    FROM ranked_products rp
    WHERE p.id = rp.id;
  END LOOP;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION expire_outdated_premiums() TO authenticated, anon;

-- 2. Index pour accélérer la recherche des abonnements expirés
CREATE INDEX IF NOT EXISTS idx_shops_premium_expiration ON shops(premium_expires_at) WHERE premium_level > 0;
CREATE INDEX IF NOT EXISTS idx_premium_subs_expiration ON premium_subscriptions(expires_at, user_id);
