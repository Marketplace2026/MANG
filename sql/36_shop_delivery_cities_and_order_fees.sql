-- ============================================================
-- MANG — Migration 36 : Villes & Tarifs de Livraison par Boutique
-- ============================================================

-- 1. Ajouter la colonne delivery_cities à la table shops (JSONB array de {city, price})
ALTER TABLE public.shops 
ADD COLUMN IF NOT EXISTS delivery_cities JSONB DEFAULT '[]'::jsonb;

-- 2. Ajouter les champs de livraison à la table orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS is_delivery BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS delivery_city TEXT,
ADD COLUMN IF NOT EXISTS delivery_fee BIGINT DEFAULT 0;

-- 3. Mise à jour de create_new_shop pour accepter delivery_cities
CREATE OR REPLACE FUNCTION create_new_shop(
  p_name TEXT,
  p_slug TEXT,
  p_description TEXT,
  p_city TEXT,
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_cover_url TEXT,
  p_has_delivery BOOLEAN,
  p_whatsapp TEXT,
  p_category_id UUID,
  p_delivery_cities JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_pieces INT;
  v_new_shop shops%ROWTYPE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Non authentifié');
  END IF;

  -- 1. Verifier le solde de pieces
  SELECT balance INTO v_pieces FROM pieces WHERE user_id = v_user_id;
  IF v_pieces IS NULL THEN
    v_pieces := 0;
  END IF;

  IF v_pieces < 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pièces insuffisantes (10 requises, solde: ' || v_pieces || ')');
  END IF;

  -- 2. Inserer la boutique avec delivery_cities
  INSERT INTO public.shops (
    owner_id, name, slug, description, city, latitude, longitude,
    cover_url, has_delivery, whatsapp, category_id, delivery_cities, is_active
  )
  VALUES (
    v_user_id, p_name, p_slug, p_description, p_city, p_latitude, p_longitude,
    p_cover_url, p_has_delivery, p_whatsapp, p_category_id, COALESCE(p_delivery_cities, '[]'::jsonb), true
  )
  RETURNING * INTO v_new_shop;

  -- 3. Deduire 10 pieces
  UPDATE public.pieces
  SET balance = balance - 10,
      updated_at = NOW()
  WHERE user_id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'shop_id', v_new_shop.id,
    'slug', v_new_shop.slug
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
