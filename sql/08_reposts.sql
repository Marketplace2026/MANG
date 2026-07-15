-- ============================================================
-- MANG — Migration Repost / Quoted Post (Task A)
-- ============================================================

-- 1. Ajouter la colonne parent_post_id à la table posts
ALTER TABLE posts ADD COLUMN IF NOT EXISTS parent_post_id UUID REFERENCES posts(id) ON DELETE SET NULL;

-- 2. Index de performance pour les relations de reposts
CREATE INDEX IF NOT EXISTS idx_posts_parent_post ON posts(parent_post_id);
