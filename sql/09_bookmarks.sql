-- ============================================================
-- MANG — Migration Favoris / Bookmarks (Task B)
-- ============================================================

-- 1. Créer la table post_bookmarks
CREATE TABLE IF NOT EXISTS post_bookmarks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id         UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

-- 2. Configurer la sécurité RLS sur post_bookmarks
ALTER TABLE post_bookmarks ENABLE ROW LEVEL SECURITY;

-- Supprimer l'ancienne politique si elle existe
DROP POLICY IF EXISTS "Utilisateurs authentifiés peuvent gérer leurs favoris" ON post_bookmarks;

CREATE POLICY "Utilisateurs authentifiés peuvent gérer leurs favoris"
  ON post_bookmarks FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Index de performance
CREATE INDEX IF NOT EXISTS idx_post_bookmarks_user ON post_bookmarks(user_id);
