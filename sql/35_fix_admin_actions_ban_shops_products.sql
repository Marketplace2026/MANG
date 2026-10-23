-- ============================================================
-- MANG — Migration 35: Persistance Absolue des Actions Admin (Ban, Boutiques, Produits)
-- ============================================================

-- 1. Colonnes requises
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ban_reason TEXT;

ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT TRUE;

-- Marquer le compte master admin
UPDATE public.profiles 
SET is_admin = TRUE, role = 'admin' 
WHERE id = 'd9f97369-ae78-4da2-844c-1c9c97b12445'::uuid;

-- 2. Fonction de vérification des droits admin
CREATE OR REPLACE FUNCTION public.is_admin_user(p_uid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
DECLARE
  v_is_admin BOOLEAN := FALSE;
BEGIN
  IF p_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  IF p_uid = 'd9f97369-ae78-4da2-844c-1c9c97b12445'::uuid THEN
    RETURN TRUE;
  END IF;

  SELECT (COALESCE(is_admin, FALSE) = TRUE OR COALESCE(role, '') = 'admin')
  INTO v_is_admin
  FROM public.profiles
  WHERE id = p_uid;

  RETURN COALESCE(v_is_admin, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 3. Table d'audit des actions
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action       TEXT NOT NULL,
  target_type  TEXT,
  target_id    TEXT,
  details      JSONB DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. POLITIQUES RLS : DÉVERROUILLER L'ADMINISTRATION
-- ============================================================

-- RLS PROFILES (L'admin peut modifier tout profil pour bannir ou débannir)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin peut modifier tout profil" ON public.profiles;
CREATE POLICY "Admin peut modifier tout profil"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.is_admin_user(auth.uid()))
  WITH CHECK (auth.uid() = id OR public.is_admin_user(auth.uid()));

-- RLS SHOPS (L'admin peut modifier et supprimer toute boutique)
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin peut modifier toute boutique" ON public.shops;
CREATE POLICY "Admin peut modifier toute boutique"
  ON public.shops FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id OR public.is_admin_user(auth.uid()))
  WITH CHECK (auth.uid() = owner_id OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Admin peut supprimer toute boutique" ON public.shops;
CREATE POLICY "Admin peut supprimer toute boutique"
  ON public.shops FOR DELETE TO authenticated
  USING (auth.uid() = owner_id OR public.is_admin_user(auth.uid()));

-- RLS PRODUCTS (L'admin peut modifier et supprimer tout produit)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin peut modifier tout produit" ON public.products;
CREATE POLICY "Admin peut modifier tout produit"
  ON public.products FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM shops WHERE id = shop_id AND owner_id = auth.uid())
    OR public.is_admin_user(auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM shops WHERE id = shop_id AND owner_id = auth.uid())
    OR public.is_admin_user(auth.uid())
  );

DROP POLICY IF EXISTS "Admin peut supprimer tout produit" ON public.products;
CREATE POLICY "Admin peut supprimer tout produit"
  ON public.products FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM shops WHERE id = shop_id AND owner_id = auth.uid())
    OR public.is_admin_user(auth.uid())
  );

-- ============================================================
-- 5. FONCTIONS RPC SÉCURISÉES (CONTOURNEMENT RLS & TRANSACTION UNIQUE)
-- ============================================================

-- RPC A : Bannir ou Débannir un utilisateur
DROP FUNCTION IF EXISTS public.admin_toggle_user_ban(UUID, BOOLEAN, TEXT);
CREATE OR REPLACE FUNCTION public.admin_toggle_user_ban(
  p_user_id UUID,
  p_is_banned BOOLEAN,
  p_ban_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Accès refusé : privilège administrateur requis.';
  END IF;

  UPDATE public.profiles
  SET is_banned = p_is_banned,
      ban_reason = CASE WHEN p_is_banned THEN COALESCE(p_ban_reason, 'Non-respect des règles de la communauté MANG') ELSE NULL END
  WHERE id = p_user_id;

  -- Si l'utilisateur est banni, désactiver également toutes ses boutiques
  IF p_is_banned THEN
    UPDATE public.shops
    SET is_active = FALSE
    WHERE owner_id = p_user_id;
  END IF;

  INSERT INTO public.admin_audit_logs (admin_id, action, target_type, target_id, details)
  VALUES (
    auth.uid(),
    CASE WHEN p_is_banned THEN 'user_banned' ELSE 'user_unbanned' END,
    'profile',
    p_user_id::text,
    jsonb_build_object('is_banned', p_is_banned, 'reason', p_ban_reason)
  );

  RETURN jsonb_build_object('success', true, 'is_banned', p_is_banned);
END;
$$;

-- RPC B : Suspendre ou Réactiver une boutique (Masquage / Démasquage)
DROP FUNCTION IF EXISTS public.admin_toggle_shop_active(UUID, BOOLEAN);
CREATE OR REPLACE FUNCTION public.admin_toggle_shop_active(
  p_shop_id UUID,
  p_is_active BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Accès refusé : privilège administrateur requis.';
  END IF;

  UPDATE public.shops
  SET is_active = p_is_active
  WHERE id = p_shop_id;

  -- Aligner la disponibilité des produits de la boutique
  UPDATE public.products
  SET is_available = p_is_active
  WHERE shop_id = p_shop_id;

  INSERT INTO public.admin_audit_logs (admin_id, action, target_type, target_id, details)
  VALUES (
    auth.uid(),
    CASE WHEN p_is_active THEN 'shop_activated' ELSE 'shop_suspended' END,
    'shop',
    p_shop_id::text,
    jsonb_build_object('is_active', p_is_active)
  );

  RETURN jsonb_build_object('success', true, 'is_active', p_is_active);
END;
$$;

-- RPC C : Masquer ou Rendre visible un produit
DROP FUNCTION IF EXISTS public.admin_toggle_product_available(UUID, BOOLEAN);
CREATE OR REPLACE FUNCTION public.admin_toggle_product_available(
  p_product_id UUID,
  p_is_available BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Accès refusé : privilège administrateur requis.';
  END IF;

  UPDATE public.products
  SET is_available = p_is_available
  WHERE id = p_product_id;

  INSERT INTO public.admin_audit_logs (admin_id, action, target_type, target_id, details)
  VALUES (
    auth.uid(),
    CASE WHEN p_is_available THEN 'product_activated' ELSE 'product_hidden' END,
    'product',
    p_product_id::text,
    jsonb_build_object('is_available', p_is_available)
  );

  RETURN jsonb_build_object('success', true, 'is_available', p_is_available);
END;
$$;

-- RPC D : Supprimer définitivement ou désactiver une boutique en toute sécurité
DROP FUNCTION IF EXISTS public.admin_delete_shop(UUID);
CREATE OR REPLACE FUNCTION public.admin_delete_shop(
  p_shop_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_orders BOOLEAN := FALSE;
  v_shop_name TEXT;
BEGIN
  IF NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Accès refusé : privilège administrateur requis.';
  END IF;

  SELECT name INTO v_shop_name FROM public.shops WHERE id = p_shop_id;

  -- Vérifier si la boutique possède des commandes passées
  SELECT EXISTS (SELECT 1 FROM public.orders WHERE shop_id = p_shop_id) INTO v_has_orders;

  IF v_has_orders THEN
    -- Désactivation sécurisée (pour ne pas violer les clés étrangères des commandes clients)
    UPDATE public.shops
    SET is_active = FALSE
    WHERE id = p_shop_id;

    UPDATE public.products
    SET is_available = FALSE
    WHERE shop_id = p_shop_id;

    INSERT INTO public.admin_audit_logs (admin_id, action, target_type, target_id, details)
    VALUES (
      auth.uid(),
      'shop_soft_deleted',
      'shop',
      p_shop_id::text,
      jsonb_build_object('reason', 'Commandes existantes rattachées', 'name', v_shop_name)
    );

    RETURN jsonb_build_object(
      'success', true,
      'soft_deleted', true,
      'message', 'Cette boutique a des commandes existantes : elle a été suspendue et masquée définitivement.'
    );
  ELSE
    -- Suppression totale en cascade si aucune commande
    DELETE FROM public.products WHERE shop_id = p_shop_id;
    DELETE FROM public.verification_requests WHERE shop_id = p_shop_id;
    DELETE FROM public.shops WHERE id = p_shop_id;

    INSERT INTO public.admin_audit_logs (admin_id, action, target_type, target_id, details)
    VALUES (
      auth.uid(),
      'shop_hard_deleted',
      'shop',
      p_shop_id::text,
      jsonb_build_object('name', v_shop_name)
    );

    RETURN jsonb_build_object(
      'success', true,
      'hard_deleted', true,
      'message', 'Boutique supprimée définitivement.'
    );
  END IF;
END;
$$;

-- RPC E : Supprimer ou masquer un produit
DROP FUNCTION IF EXISTS public.admin_delete_product(UUID);
CREATE OR REPLACE FUNCTION public.admin_delete_product(
  p_product_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_orders BOOLEAN := FALSE;
  v_prod_name TEXT;
BEGIN
  IF NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Accès refusé : privilège administrateur requis.';
  END IF;

  SELECT name INTO v_prod_name FROM public.products WHERE id = p_product_id;

  SELECT EXISTS (SELECT 1 FROM public.orders WHERE product_id = p_product_id) INTO v_has_orders;

  IF v_has_orders THEN
    UPDATE public.products
    SET is_available = FALSE
    WHERE id = p_product_id;

    RETURN jsonb_build_object(
      'success', true,
      'soft_deleted', true,
      'message', 'Ce produit est lié à des commandes : il a été masqué du catalogue.'
    );
  ELSE
    DELETE FROM public.products WHERE id = p_product_id;

    RETURN jsonb_build_object(
      'success', true,
      'hard_deleted', true,
      'message', 'Produit supprimé définitivement.'
    );
  END IF;
END;
$$;
