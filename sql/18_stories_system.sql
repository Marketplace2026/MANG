-- ============================================================
-- SQL : SYSTÈME DE STORIES ET BUCKET DE STOCKAGE
-- ============================================================

-- 1. Création de la table stories
CREATE TABLE IF NOT EXISTS public.stories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  media_url   TEXT NOT NULL,
  caption     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  expires_at  TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  shop_slug   TEXT -- Utile si la story renvoie vers une boutique
);

-- 2. Activation de la RLS sur la table stories
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

-- 3. Politiques RLS de la table stories
DROP POLICY IF EXISTS "Stories visibles par tous" ON public.stories;
CREATE POLICY "Stories visibles par tous" 
  ON public.stories FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Utilisateur peut ajouter ses stories" ON public.stories;
CREATE POLICY "Utilisateur peut ajouter ses stories" 
  ON public.stories FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Utilisateur peut supprimer ses propres stories" ON public.stories;
CREATE POLICY "Utilisateur peut supprimer ses propres stories" 
  ON public.stories FOR DELETE TO authenticated 
  USING (auth.uid() = user_id);

-- 4. Initialisation du bucket Storage public 'stories'
INSERT INTO storage.buckets (id, name, public)
VALUES ('stories', 'stories', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Politiques d'accès au bucket 'stories' dans storage.objects
DROP POLICY IF EXISTS "Stories publiques en lecture" ON storage.objects;
CREATE POLICY "Stories publiques en lecture" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'stories');

DROP POLICY IF EXISTS "Utilisateurs connectés peuvent uploader une story" ON storage.objects;
CREATE POLICY "Utilisateurs connectés peuvent uploader une story" 
  ON storage.objects FOR INSERT TO authenticated 
  WITH CHECK (bucket_id = 'stories' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Utilisateurs peuvent supprimer leurs fichiers de story" ON storage.objects;
CREATE POLICY "Utilisateurs peuvent supprimer leurs fichiers de story" 
  ON storage.objects FOR DELETE TO authenticated 
  USING (bucket_id = 'stories' AND (storage.foldername(name))[1] = auth.uid()::text);
