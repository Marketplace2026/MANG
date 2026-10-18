-- ============================================================
-- MANG — Migration 32 : Système d'Avis & Notations avec Badge "Achat Vérifié"
-- ============================================================

-- 1. Table des avis produits (product_reviews)
CREATE TABLE IF NOT EXISTS public.product_reviews (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id           UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id              UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating               INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment              TEXT,
  photo_urls           TEXT[] DEFAULT '{}'::text[],
  is_verified_purchase BOOLEAN DEFAULT FALSE,
  order_id             UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, user_id)
);

-- Colonnes additionnelles au cas où la table existait déjà
ALTER TABLE public.product_reviews ADD COLUMN IF NOT EXISTS is_verified_purchase BOOLEAN DEFAULT FALSE;
ALTER TABLE public.product_reviews ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL;
ALTER TABLE public.product_reviews ADD COLUMN IF NOT EXISTS photo_urls TEXT[] DEFAULT '{}'::text[];

-- 2. Table des avis boutiques (shop_reviews)
CREATE TABLE IF NOT EXISTS public.shop_reviews (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id              UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  user_id              UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating               INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment              TEXT,
  is_verified_purchase BOOLEAN DEFAULT FALSE,
  order_id             UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shop_id, user_id)
);

ALTER TABLE public.shop_reviews ADD COLUMN IF NOT EXISTS is_verified_purchase BOOLEAN DEFAULT FALSE;
ALTER TABLE public.shop_reviews ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL;

-- 3. Activation RLS
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_reviews ENABLE ROW LEVEL SECURITY;

-- Politiques RLS product_reviews
DROP POLICY IF EXISTS "Avis produits lisibles par tous" ON public.product_reviews;
CREATE POLICY "Avis produits lisibles par tous"
  ON public.product_reviews FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Utilisateurs connectés peuvent publier un avis produit" ON public.product_reviews;
CREATE POLICY "Utilisateurs connectés peuvent publier un avis produit"
  ON public.product_reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Auteurs peuvent modifier leur avis produit" ON public.product_reviews;
CREATE POLICY "Auteurs peuvent modifier leur avis produit"
  ON public.product_reviews FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Auteurs peuvent supprimer leur avis produit" ON public.product_reviews;
CREATE POLICY "Auteurs peuvent supprimer leur avis produit"
  ON public.product_reviews FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Politiques RLS shop_reviews
DROP POLICY IF EXISTS "Avis boutiques lisibles par tous" ON public.shop_reviews;
CREATE POLICY "Avis boutiques lisibles par tous"
  ON public.shop_reviews FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Utilisateurs connectés peuvent publier un avis boutique" ON public.shop_reviews;
CREATE POLICY "Utilisateurs connectés peuvent publier un avis boutique"
  ON public.shop_reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Auteurs peuvent modifier leur avis boutique" ON public.shop_reviews;
CREATE POLICY "Auteurs peuvent modifier leur avis boutique"
  ON public.shop_reviews FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Auteurs peuvent supprimer leur avis boutique" ON public.shop_reviews;
CREATE POLICY "Auteurs peuvent supprimer leur avis boutique"
  ON public.shop_reviews FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 4. Déclencheur automatique de détection d'"Achat Vérifié" pour produit
CREATE OR REPLACE FUNCTION check_verified_purchase()
RETURNS TRIGGER AS $$
BEGIN
  -- Vérifie si l'utilisateur a commandé ce produit (commande validée, payée ou livrée)
  IF EXISTS (
    SELECT 1 FROM public.orders
    WHERE buyer_id = NEW.user_id
      AND product_id = NEW.product_id
      AND (status IN ('paid', 'delivered', 'accepted') OR delivery_status = 'delivered')
  ) OR NEW.order_id IS NOT NULL THEN
    NEW.is_verified_purchase := TRUE;
  ELSE
    NEW.is_verified_purchase := FALSE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_verified_purchase ON public.product_reviews;
CREATE TRIGGER trg_check_verified_purchase
  BEFORE INSERT OR UPDATE ON public.product_reviews
  FOR EACH ROW
  EXECUTE FUNCTION check_verified_purchase();

-- 5. Déclencheur automatique de détection d'"Achat Vérifié" pour boutique
CREATE OR REPLACE FUNCTION check_verified_shop_purchase()
RETURNS TRIGGER AS $$
BEGIN
  -- Vérifie si l'utilisateur a commandé dans cette boutique
  IF EXISTS (
    SELECT 1 FROM public.orders
    WHERE buyer_id = NEW.user_id
      AND shop_id = NEW.shop_id
      AND (status IN ('paid', 'delivered', 'accepted') OR delivery_status = 'delivered')
  ) OR NEW.order_id IS NOT NULL THEN
    NEW.is_verified_purchase := TRUE;
  ELSE
    NEW.is_verified_purchase := FALSE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_verified_shop_purchase ON public.shop_reviews;
CREATE TRIGGER trg_check_verified_shop_purchase
  BEFORE INSERT OR UPDATE ON public.shop_reviews
  FOR EACH ROW
  EXECUTE FUNCTION check_verified_shop_purchase();

-- 6. Index pour requêtes instantanées
CREATE INDEX IF NOT EXISTS idx_product_reviews_prod ON public.product_reviews (product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_reviews_verified ON public.product_reviews (product_id, is_verified_purchase);
CREATE INDEX IF NOT EXISTS idx_shop_reviews_shop ON public.shop_reviews (shop_id, created_at DESC);
