-- ============================================================
-- MANG — Migration 30 : Correction Création de Boutique, Storage & Pièces
-- ============================================================

-- 1. Initialisation des buckets de stockage (au cas où ils n'existent pas)
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('shop-covers', 'shop-covers', true),
  ('covers', 'covers', true),
  ('product-images', 'product-images', true),
  ('products', 'products', true),
  ('avatars', 'avatars', true),
  ('message-files', 'message-files', true),
  ('messages', 'messages', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Politiques RLS pour les buckets Storage
DROP POLICY IF EXISTS "Lecture publique des buckets MANG" ON storage.objects;
CREATE POLICY "Lecture publique des buckets MANG" 
  ON storage.objects FOR SELECT 
  USING (bucket_id IN ('shop-covers', 'covers', 'product-images', 'products', 'avatars', 'message-files', 'messages', 'stories'));

DROP POLICY IF EXISTS "Upload authentifie dans les buckets MANG" ON storage.objects;
CREATE POLICY "Upload authentifie dans les buckets MANG" 
  ON storage.objects FOR INSERT TO authenticated 
  WITH CHECK (bucket_id IN ('shop-covers', 'covers', 'product-images', 'products', 'avatars', 'message-files', 'messages', 'stories'));

DROP POLICY IF EXISTS "Modification authentifiee dans les buckets MANG" ON storage.objects;
CREATE POLICY "Modification authentifiee dans les buckets MANG" 
  ON storage.objects FOR UPDATE TO authenticated 
  USING (bucket_id IN ('shop-covers', 'covers', 'product-images', 'products', 'avatars', 'message-files', 'messages', 'stories'));

DROP POLICY IF EXISTS "Suppression authentifiee dans les buckets MANG" ON storage.objects;
CREATE POLICY "Suppression authentifiee dans les buckets MANG" 
  ON storage.objects FOR DELETE TO authenticated 
  USING (bucket_id IN ('shop-covers', 'covers', 'product-images', 'products', 'avatars', 'message-files', 'messages', 'stories'));

-- 3. RLS sur la table shops
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vendeur peut créer sa boutique" ON public.shops;
CREATE POLICY "Vendeur peut créer sa boutique"
  ON public.shops FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Boutiques visibles par tous" ON public.shops;
CREATE POLICY "Boutiques visibles par tous"
  ON public.shops FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Vendeur peut modifier sa boutique" ON public.shops;
CREATE POLICY "Vendeur peut modifier sa boutique"
  ON public.shops FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id);

-- 4. RLS sur la table pieces (autoriser l'utilisateur a mettre a jour son solde)
ALTER TABLE public.pieces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Utilisateur peut mettre à jour ses pièces" ON public.pieces;
CREATE POLICY "Utilisateur peut mettre à jour ses pièces"
  ON public.pieces FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Utilisateur peut insérer ses propres pièces" ON public.pieces;
CREATE POLICY "Utilisateur peut insérer ses propres pièces" 
  ON public.pieces FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = user_id);

-- 5. RLS sur notifications pour insertion
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Utilisateur peut créer des notifications" ON public.notifications;
CREATE POLICY "Utilisateur peut créer des notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 6. Fonction RPC sécurisée pour créer une boutique (SECURITY DEFINER)
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
  p_category_id UUID
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

  -- 2. Inserer la boutique
  INSERT INTO public.shops (
    owner_id, name, slug, description, city, latitude, longitude,
    cover_url, has_delivery, whatsapp, category_id, is_active
  )
  VALUES (
    v_user_id, p_name, p_slug, p_description, p_city, p_latitude, p_longitude,
    p_cover_url, p_has_delivery, p_whatsapp, p_category_id, true
  )
  RETURNING * INTO v_new_shop;

  -- 3. Deduire 10 pieces
  UPDATE public.pieces
  SET balance = balance - 10,
      updated_at = NOW()
  WHERE user_id = v_user_id;

  -- 4. Notifier l'utilisateur
  INSERT INTO public.notifications (user_id, type, title, body, reference_id, reference_type)
  VALUES (
    v_user_id,
    'order_new',
    'Boutique créée !',
    'Votre boutique "' || p_name || '" est maintenant en ligne.',
    v_new_shop.id,
    'shop'
  );

  RETURN jsonb_build_object('success', true, 'shop', row_to_json(v_new_shop));
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ce nom de boutique ou lien existe déjà');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
