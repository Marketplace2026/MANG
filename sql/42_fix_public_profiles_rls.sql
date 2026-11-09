-- ============================================================
-- MIGRATION 42 : RÉPARATION COMPLÈTE DE LA VISIBILITÉ DES PROFILS PUBLICS (RLS)
-- ============================================================
-- Problème : Si une politique RLS sur profiles restreint l'accès à "auth.uid() = id",
-- chaque utilisateur ne peut voir QUE son propre profil, et les profils des autres
-- utilisateurs affichent "Profil introuvable".
-- Solution : Permettre la lecture publique (SELECT) de tous les profils par tous les utilisateurs (authentifiés ou visiteurs).

-- 1. S'assurer que RLS est bien activé sur profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Nettoyage de TOUTES les anciennes politiques SELECT potentiellement restrictives
DROP POLICY IF EXISTS "Profils visibles par tous les utilisateurs connectés" ON public.profiles;
DROP POLICY IF EXISTS "Profils publics visibles par tous" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can only view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Allow public read access" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users only" ON public.profiles;

-- 3. Politique SELECT universelle : tous les profils sont consultables publiquement
CREATE POLICY "Profils publics visibles par tous"
  ON public.profiles FOR SELECT
  USING (true);

-- 4. Protection de l'UPDATE : chaque utilisateur ne peut modifier QUE son propre profil
DROP POLICY IF EXISTS "Utilisateur peut modifier son propre profil" ON public.profiles;
CREATE POLICY "Utilisateur peut modifier son propre profil"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 5. Protection de l'INSERT : lors de l'inscription
DROP POLICY IF EXISTS "Utilisateur peut insérer son propre profil" ON public.profiles;
CREATE POLICY "Utilisateur peut insérer son propre profil"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- 6. Visibilité des abonnements (user_follows)
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Abonnements visibles par tous" ON public.user_follows;
DROP POLICY IF EXISTS "user_follows_select_policy" ON public.user_follows;
CREATE POLICY "Abonnements visibles par tous"
  ON public.user_follows FOR SELECT
  USING (true);

-- 7. Visibilité des publications (posts)
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Posts visibles par tous" ON public.posts;
DROP POLICY IF EXISTS "posts_select_policy" ON public.posts;
CREATE POLICY "Posts visibles par tous"
  ON public.posts FOR SELECT
  USING (true);

-- 8. Index pour recherche ultra-rapide par username insensible à la casse
CREATE INDEX IF NOT EXISTS idx_profiles_username_lower ON public.profiles (LOWER(username));

-- 9. Vérification
SELECT tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles';
