-- ============================================================
-- TÂCHE G : INDEXATION DB FINALE & SÉCURITÉ RLS
-- ============================================================

-- 1. DROP des anciennes policies RLS restrictives
DROP POLICY IF EXISTS "Utilisateur peut modifier son post" ON posts;
DROP POLICY IF EXISTS "Utilisateur peut supprimer son post" ON posts;
DROP POLICY IF EXISTS "Utilisateur ou admin peut modifier le post" ON posts;
DROP POLICY IF EXISTS "Utilisateur ou admin peut supprimer le post" ON posts;

-- 2. Recréation des policies RLS (Auteur OU Admin/Modérateur)
CREATE POLICY "Utilisateur ou admin peut modifier le post"
  ON posts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = 'd9f97369-ae78-4da2-844c-1c9c97b12445'::uuid);

CREATE POLICY "Utilisateur ou admin peut supprimer le post"
  ON posts FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = 'd9f97369-ae78-4da2-844c-1c9c97b12445'::uuid);

-- 3. Création des index de performance pour l'actualité et les commentaires
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_likes_count ON posts(likes_count DESC);
CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id);
