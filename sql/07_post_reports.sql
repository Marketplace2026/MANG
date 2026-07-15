-- ============================================================
-- MANG — Migration Signalements & Quarantaine (Task D)
-- ============================================================

-- 1. Ajouter la colonne status à la table posts si elle n'existe pas
ALTER TABLE posts ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

-- 2. Créer la table post_reports
CREATE TABLE IF NOT EXISTS post_reports (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id         UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason          VARCHAR(50) NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- 3. Configurer la sécurité RLS sur post_reports
ALTER TABLE post_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utilisateurs authentifiés peuvent insérer des signalements"
  ON post_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Utilisateurs peuvent voir leurs propres signalements"
  ON post_reports FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 4. Créer la fonction et le trigger pour la mise en quarantaine automatique
CREATE OR REPLACE FUNCTION handle_post_quarantine()
RETURNS TRIGGER AS $$
DECLARE
  v_reports_count INTEGER;
BEGIN
  -- Compter le nombre de signalements uniques pour ce post
  SELECT COUNT(*) INTO v_reports_count 
  FROM post_reports 
  WHERE post_id = NEW.post_id;

  -- Si >= 3 signalements, passer le post en quarantaine
  IF v_reports_count >= 3 THEN
    UPDATE posts 
    SET status = 'quarantined' 
    WHERE id = NEW.post_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour exécuter la quarantaine après insertion d'un signalement
DROP TRIGGER IF EXISTS tr_after_post_report_insert ON post_reports;
CREATE TRIGGER tr_after_post_report_insert
  AFTER INSERT ON post_reports
  FOR EACH ROW
  EXECUTE FUNCTION handle_post_quarantine();
