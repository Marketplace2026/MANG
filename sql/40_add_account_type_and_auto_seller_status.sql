-- ============================================================
-- MANG — Migration 40 : Distinction Automatique Vendeurs & Acheteurs
-- ============================================================

-- 1. Ajout de la colonne account_type à profiles
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'buyer' CHECK (account_type IN ('buyer', 'seller', 'both'));

-- 2. Mise à jour immédiate et rétroactive de tous les utilisateurs ayant déjà une boutique
UPDATE profiles 
SET account_type = 'seller'
WHERE id IN (
  SELECT DISTINCT owner_id 
  FROM shops 
  WHERE owner_id IS NOT NULL
);

-- 3. Trigger automatique : dès qu'une boutique est créée, le propriétaire devient automatiquement "seller"
CREATE OR REPLACE FUNCTION trg_set_vendor_on_shop_created()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.owner_id IS NOT NULL THEN
    UPDATE profiles 
    SET account_type = 'seller'
    WHERE id = NEW.owner_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_set_vendor_on_shop_created ON shops;
CREATE TRIGGER tr_set_vendor_on_shop_created
  AFTER INSERT OR UPDATE OF owner_id ON shops
  FOR EACH ROW
  EXECUTE FUNCTION trg_set_vendor_on_shop_created();

-- 4. Vue d'information rapide ou fonction pour récupérer le statut d'un profil
CREATE OR REPLACE FUNCTION get_user_display_role(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_role TEXT := 'buyer';
  v_shop_name TEXT := NULL;
  v_shop_slug TEXT := NULL;
  v_is_verified BOOLEAN := FALSE;
BEGIN
  -- Vérifier si l'utilisateur possède une boutique
  SELECT name, slug, COALESCE(is_verified, FALSE)
  INTO v_shop_name, v_shop_slug, v_is_verified
  FROM shops
  WHERE owner_id = p_user_id
  LIMIT 1;

  IF v_shop_name IS NOT NULL THEN
    v_role := 'seller';
  END IF;

  RETURN jsonb_build_object(
    'account_type', v_role,
    'is_seller', (v_role = 'seller'),
    'shop_name', v_shop_name,
    'shop_slug', v_shop_slug,
    'is_verified', v_is_verified
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
