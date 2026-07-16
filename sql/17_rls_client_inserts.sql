-- ============================================================
-- SQL MIGRATION : POLICIES RLS POUR L'INSERTION CÔTÉ CLIENT
-- ============================================================

-- 1. Autoriser l'utilisateur authentifié à insérer son propre profil
DROP POLICY IF EXISTS "Utilisateur peut insérer son propre profil" ON public.profiles;
CREATE POLICY "Utilisateur peut insérer son propre profil" 
  ON public.profiles FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = id);

-- 2. Autoriser l'utilisateur authentifié à insérer son propre wallet
DROP POLICY IF EXISTS "Utilisateur peut insérer son propre wallet" ON public.wallets;
CREATE POLICY "Utilisateur peut insérer son propre wallet" 
  ON public.wallets FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = user_id);

-- 3. Autoriser l'utilisateur authentifié à insérer sa propre ligne de pièces
DROP POLICY IF EXISTS "Utilisateur peut insérer ses propres pièces" ON public.pieces;
CREATE POLICY "Utilisateur peut insérer ses propres pièces" 
  ON public.pieces FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = user_id);
