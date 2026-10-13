-- ============================================================
-- MANG — Privilèges Administrateur & Modération Complète (Task Admin Cockpit)
-- ============================================================

-- 1. Colonnes d'administration sur profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ban_reason TEXT;

-- Marquer le compte super-administrateur
UPDATE public.profiles SET is_admin = TRUE WHERE id = 'd9f97369-ae78-4da2-844c-1c9c97b12445'::uuid;

-- 2. RLS sur profiles : l'admin peut tout voir, modifier (ex: bannir) et supprimer
DROP POLICY IF EXISTS "Admin peut modifier tout profil" ON public.profiles;
CREATE POLICY "Admin peut modifier tout profil"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id OR auth.uid() = 'd9f97369-ae78-4da2-844c-1c9c97b12445'::uuid);

DROP POLICY IF EXISTS "Admin peut supprimer un profil" ON public.profiles;
CREATE POLICY "Admin peut supprimer un profil"
  ON public.profiles FOR DELETE TO authenticated
  USING (auth.uid() = 'd9f97369-ae78-4da2-844c-1c9c97b12445'::uuid);

-- 3. RLS sur shops : l'admin peut modifier et supprimer n'importe quelle boutique
DROP POLICY IF EXISTS "Admin peut modifier toute boutique" ON public.shops;
CREATE POLICY "Admin peut modifier toute boutique"
  ON public.shops FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id OR auth.uid() = 'd9f97369-ae78-4da2-844c-1c9c97b12445'::uuid);

DROP POLICY IF EXISTS "Admin peut supprimer toute boutique" ON public.shops;
CREATE POLICY "Admin peut supprimer toute boutique"
  ON public.shops FOR DELETE TO authenticated
  USING (auth.uid() = owner_id OR auth.uid() = 'd9f97369-ae78-4da2-844c-1c9c97b12445'::uuid);

-- 4. RLS sur products : l'admin peut modifier et supprimer n'importe quel produit
DROP POLICY IF EXISTS "Admin peut modifier tout produit" ON public.products;
CREATE POLICY "Admin peut modifier tout produit"
  ON public.products FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM shops WHERE id = shop_id AND owner_id = auth.uid())
    OR auth.uid() = 'd9f97369-ae78-4da2-844c-1c9c97b12445'::uuid
  );

DROP POLICY IF EXISTS "Admin peut supprimer tout produit" ON public.products;
CREATE POLICY "Admin peut supprimer tout produit"
  ON public.products FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM shops WHERE id = shop_id AND owner_id = auth.uid())
    OR auth.uid() = 'd9f97369-ae78-4da2-844c-1c9c97b12445'::uuid
  );

-- 5. RLS sur posts & comments : l'admin peut tout supprimer et modifier
DROP POLICY IF EXISTS "Admin peut supprimer tout post" ON public.posts;
CREATE POLICY "Admin peut supprimer tout post"
  ON public.posts FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = 'd9f97369-ae78-4da2-844c-1c9c97b12445'::uuid);

DROP POLICY IF EXISTS "Admin peut modifier tout post" ON public.posts;
CREATE POLICY "Admin peut modifier tout post"
  ON public.posts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = 'd9f97369-ae78-4da2-844c-1c9c97b12445'::uuid);

DROP POLICY IF EXISTS "Admin peut supprimer tout commentaire post" ON public.post_comments;
CREATE POLICY "Admin peut supprimer tout commentaire post"
  ON public.post_comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = 'd9f97369-ae78-4da2-844c-1c9c97b12445'::uuid);

-- 6. RLS sur wallets : l'admin peut voir les portefeuilles pour le tableau de bord de trésorerie
DROP POLICY IF EXISTS "Admin peut voir tous les wallets" ON public.wallets;
CREATE POLICY "Admin peut voir tous les wallets"
  ON public.wallets FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = 'd9f97369-ae78-4da2-844c-1c9c97b12445'::uuid);

-- 7. Fonction d'administration sécurisée pour supprimer complètement un utilisateur (cascade propre)
CREATE OR REPLACE FUNCTION admin_delete_user(p_target_user_id UUID)
RETURNS JSON AS $$
BEGIN
  IF auth.uid() != 'd9f97369-ae78-4da2-844c-1c9c97b12445'::uuid THEN
    RAISE EXCEPTION 'Accès refusé : privilège super-administrateur requis.';
  END IF;

  DELETE FROM public.profiles WHERE id = p_target_user_id;
  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
