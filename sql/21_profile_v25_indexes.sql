-- ============================================================
-- MANG v2.5 — OPTIMISATION DES INDEX ET FONCTIONS RPC PROFIL
-- Exécutez ce script dans l'éditeur SQL de votre console Supabase
-- ============================================================

-- 1. Index pour accélérer la recherche par nom d'utilisateur et jointures
CREATE INDEX IF NOT EXISTS idx_profiles_username_lower ON profiles (LOWER(username));
CREATE INDEX IF NOT EXISTS idx_shops_owner_id ON shops (owner_id);
CREATE INDEX IF NOT EXISTS idx_products_shop_available ON products (shop_id, is_available) WHERE is_available = true;
CREATE INDEX IF NOT EXISTS idx_user_follows_following_follower ON user_follows (following_id, follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_follower_following ON user_follows (follower_id, following_id);
CREATE INDEX IF NOT EXISTS idx_shop_reviews_shop_id ON shop_reviews (shop_id);

-- 2. Fonction RPC consolidée pour récupérer le profil, les statistiques et la boutique en 1 seul appel
CREATE OR REPLACE FUNCTION get_public_profile_v25(p_username TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'profile', to_jsonb(p.*),
    'shop', to_jsonb(s.*),
    'stats', jsonb_build_object(
      'followers_count', (SELECT COUNT(*) FROM user_follows WHERE following_id = p.id),
      'following_count', (SELECT COUNT(*) FROM user_follows WHERE follower_id = p.id),
      'products_count', (SELECT COUNT(*) FROM products WHERE shop_id = s.id AND is_available = true),
      'posts_count', (SELECT COUNT(*) FROM posts WHERE user_id = p.id),
      'avg_rating', COALESCE((SELECT AVG(rating) FROM shop_reviews WHERE shop_id = s.id), 5.0),
      'reviews_count', (SELECT COUNT(*) FROM shop_reviews WHERE shop_id = s.id)
    )
  ) INTO v_result
  FROM profiles p
  LEFT JOIN shops s ON s.owner_id = p.id AND s.is_active = true
  WHERE LOWER(p.username) = LOWER(p_username)
  LIMIT 1;

  RETURN v_result;
END;
$$;

-- Notification d'exécution réussie
COMMENT ON FUNCTION get_public_profile_v25 IS 'Récupération haute performance du profil public MANG v2.5';
