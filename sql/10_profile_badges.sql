-- ============================================================
-- MANG — Migration Système de Badges Profil (Task C)
-- ============================================================

-- 1. Ajouter la colonne badges à la table profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS badges TEXT[] DEFAULT '{}';

-- 2. Fonction pour recalculer les badges d'un utilisateur
CREATE OR REPLACE FUNCTION update_user_badges(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_sales_count INTEGER;
  v_top_posts_count INTEGER;
  v_has_expert_bio BOOLEAN;
  v_badges TEXT[] := '{}';
BEGIN
  -- Compter les ventes du vendeur (commandes payées ou livrées)
  SELECT COUNT(*) INTO v_sales_count
  FROM orders
  WHERE seller_id = p_user_id AND status IN ('paid', 'delivered');

  -- Compter les posts populaires (+50 posts avec +10 likes)
  SELECT COUNT(*) INTO v_top_posts_count
  FROM posts
  WHERE user_id = p_user_id AND likes_count >= 10;

  -- Vérifier si l'utilisateur a déjà le badge "Expert Bio" (car ce badge est attribué manuellement par l'admin)
  SELECT COALESCE(('Expert Bio' = ANY(badges)), false) INTO v_has_expert_bio
  FROM profiles
  WHERE id = p_user_id;

  -- Construire le tableau de badges
  IF v_sales_count >= 100 THEN
    v_badges := array_append(v_badges, 'Producteur Vérifié');
  END IF;

  IF v_top_posts_count >= 50 THEN
    v_badges := array_append(v_badges, 'Top Contributeur');
  END IF;

  -- Conserver le badge Expert Bio s'il existait
  IF v_has_expert_bio THEN
    v_badges := array_append(v_badges, 'Expert Bio');
  END IF;

  -- Mettre à jour le profil
  UPDATE profiles
  SET badges = v_badges
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Déclencheur pour les commandes (mise à jour des ventes)
CREATE OR REPLACE FUNCTION tr_on_order_status_update_badges()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('paid', 'delivered') THEN
    PERFORM update_user_badges(NEW.seller_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_orders_badges ON orders;
CREATE TRIGGER tr_orders_badges
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION tr_on_order_status_update_badges();

-- 4. Déclencheur pour les posts (mise à jour des likes sur posts)
CREATE OR REPLACE FUNCTION tr_on_post_update_badges()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_user_badges(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_posts_badges ON posts;
CREATE TRIGGER tr_posts_badges
  AFTER INSERT OR UPDATE OF likes_count ON posts
  FOR EACH ROW
  EXECUTE FUNCTION tr_on_post_update_badges();
