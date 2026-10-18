-- ============================================================
-- MANG — Migration 30 : Correction Définitive Création Boutique & Notifications
-- ============================================================

-- 1. Supprimer la contrainte restrictive sur le type de notifications
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- 2. Initialisation des buckets de stockage (au cas où ils n'existent pas)
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

-- 3. Politiques RLS pour les buckets Storage
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

-- 4. RLS sur la table shops
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

-- 5. RLS sur la table pieces (autoriser l'utilisateur a mettre a jour son solde)
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

-- 6. RLS sur notifications pour insertion
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Utilisateur peut créer des notifications" ON public.notifications;
CREATE POLICY "Utilisateur peut créer des notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 7. Trigger de parrainage sécurisé (ne bloque JAMAIS la création de boutique)
CREATE OR REPLACE FUNCTION handle_referred_shop_creation()
RETURNS TRIGGER AS $$
DECLARE
  v_referral referrals%ROWTYPE;
  v_referred_username TEXT;
BEGIN
  SELECT * INTO v_referral
  FROM referrals
  WHERE referred_id = NEW.owner_id AND status = 'registered';

  IF FOUND THEN
    UPDATE referrals
    SET status = 'rewarded',
        pieces_given = pieces_given + 20,
        updated_at = NOW()
    WHERE id = v_referral.id;

    UPDATE pieces
    SET balance = balance + 20
    WHERE user_id = v_referral.referrer_id;

    SELECT username INTO v_referred_username FROM profiles WHERE id = NEW.owner_id;

    BEGIN
      PERFORM create_notification(
        v_referral.referrer_id,
        'shop_like',
        'Boutique filleul créée !',
        'Votre filleul @' || COALESCE(v_referred_username, 'filleul') || ' a créé sa boutique. Vous recevez 20 pièces !',
        NEW.id,
        'shop'
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_referred_shop_created ON shops;
CREATE TRIGGER trg_referred_shop_created
  AFTER INSERT ON shops
  FOR EACH ROW
  EXECUTE FUNCTION handle_referred_shop_creation();

-- 8. Fonction RPC sécurisée pour créer une boutique (SECURITY DEFINER)
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

  -- 4. Notifier l'utilisateur (sécurisé, ne bloque jamais la création de boutique)
  BEGIN
    INSERT INTO public.notifications (user_id, type, title, body, reference_id, reference_type)
    VALUES (
      v_user_id,
      'order_new',
      'Boutique créée !',
      'Votre boutique "' || p_name || '" est maintenant en ligne.',
      v_new_shop.id,
      'shop'
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object('success', true, 'shop', row_to_json(v_new_shop));
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ce nom de boutique ou lien existe déjà');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
