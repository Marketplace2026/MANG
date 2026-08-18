-- ============================================================
-- MANG v3.0 — SYSTEME DE NOTIFICATIONS WORLD-CLASS
-- Exécutez ce script dans l'éditeur SQL de Supabase
-- ============================================================

-- 1. Enrichissement du schéma notifications
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS cluster_count INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 2. Indexation haute performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications (user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_sender ON notifications (sender_id);

-- 3. Fonction RPC intelligente d'agrégation des notifications (Clustering)
CREATE OR REPLACE FUNCTION create_smart_notification(
  p_user_id UUID,
  p_sender_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT,
  p_reference_id TEXT DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS VOID AS $$
DECLARE
  v_existing_id UUID;
BEGIN
  -- Si p_sender_id est identique à p_user_id, ignorer (auto-notification)
  IF p_sender_id IS NOT NULL AND p_sender_id = p_user_id THEN
    RETURN;
  END IF;

  -- Chercher une notification similaire récente (< 24h) non lue pour regrouper (Clustering)
  IF p_reference_id IS NOT NULL THEN
    SELECT id INTO v_existing_id
    FROM notifications
    WHERE user_id = p_user_id
      AND type = p_type
      AND reference_id = p_reference_id
      AND is_read = false
      AND created_at > (NOW() - INTERVAL '24 hours')
    LIMIT 1;
  END IF;

  IF v_existing_id IS NOT NULL THEN
    -- Incrémenter le cluster et mettre à jour l'horodatage
    UPDATE notifications
    SET cluster_count = COALESCE(cluster_count, 1) + 1,
        sender_id = p_sender_id,
        body = p_body,
        created_at = NOW()
    WHERE id = v_existing_id;
  ELSE
    -- Insérer une nouvelle notification
    INSERT INTO notifications (
      user_id, sender_id, type, title, body, reference_id, reference_type, cluster_count, metadata, is_read, created_at
    )
    VALUES (
      p_user_id, p_sender_id, p_type, p_title, p_body, p_reference_id, p_reference_type, 1, p_metadata, false, NOW()
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RPC de récupération enrichie des notifications avec Profil Expéditeur (Single Query, Zero N+1)
CREATE OR REPLACE FUNCTION get_user_notifications_v30(p_user_id UUID, p_limit INT DEFAULT 50)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', n.id,
      'user_id', n.user_id,
      'sender_id', n.sender_id,
      'type', n.type,
      'title', n.title,
      'body', n.body,
      'is_read', n.is_read,
      'reference_id', n.reference_id,
      'reference_type', n.reference_type,
      'cluster_count', COALESCE(n.cluster_count, 1),
      'metadata', COALESCE(n.metadata, '{}'::jsonb),
      'created_at', n.created_at,
      'sender', CASE 
        WHEN p.id IS NOT NULL THEN jsonb_build_object(
          'id', p.id,
          'username', p.username,
          'full_name', p.full_name,
          'avatar_url', p.avatar_url,
          'city', p.city
        )
        ELSE NULL
      END
    )
    ORDER BY n.created_at DESC
  ), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT * FROM notifications 
    WHERE user_id = p_user_id 
    ORDER BY created_at DESC 
    LIMIT p_limit
  ) n
  LEFT JOIN profiles p ON p.id = n.sender_id;

  RETURN v_result;
END;
$$;
