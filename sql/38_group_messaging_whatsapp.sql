-- ============================================================
-- MANG — Migration 38 : Messagerie de Groupe Type WhatsApp
-- ============================================================

-- 1. Ajout des colonnes de groupe à la table conversations
ALTER TABLE conversations 
  ADD COLUMN IF NOT EXISTS is_group BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- 2. Création de la table des membres de conversation (conversation_members)
CREATE TABLE IF NOT EXISTS conversation_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conv_members_user ON conversation_members(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_members_conv ON conversation_members(conversation_id);

-- Activer RLS sur conversation_members
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;

-- 3. Politiques RLS pour conversation_members
DROP POLICY IF EXISTS "Membres peuvent voir les membres de leur conversation" ON conversation_members;
CREATE POLICY "Membres peuvent voir les membres de leur conversation"
  ON conversation_members FOR SELECT TO authenticated
  USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_members WHERE user_id = auth.uid()
    )
    OR
    conversation_id IN (
      SELECT id FROM conversations WHERE buyer_id = auth.uid() OR seller_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins ou créateurs peuvent ajouter des membres" ON conversation_members;
CREATE POLICY "Admins ou créateurs peuvent ajouter des membres"
  ON conversation_members FOR INSERT TO authenticated
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM conversations WHERE created_by = auth.uid()
    )
    OR
    conversation_id IN (
      SELECT conversation_id FROM conversation_members WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR
    user_id = auth.uid() -- Auto-rejoindre lors de la création
  );

DROP POLICY IF EXISTS "Admins ou membres peuvent quitter ou retirer" ON conversation_members;
CREATE POLICY "Admins ou membres peuvent quitter ou retirer"
  ON conversation_members FOR DELETE TO authenticated
  USING (
    user_id = auth.uid() -- L'utilisateur peut se retirer lui-même (quitter le groupe)
    OR
    conversation_id IN (
      SELECT conversation_id FROM conversation_members WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR
    conversation_id IN (
      SELECT id FROM conversations WHERE created_by = auth.uid()
    )
  );

-- 4. Mise à jour des politiques RLS de conversations pour inclure les groupes
DROP POLICY IF EXISTS "Conversation visible par ses participants" ON conversations;
CREATE POLICY "Conversation visible par ses participants"
  ON conversations FOR SELECT TO authenticated
  USING (
    buyer_id = auth.uid() 
    OR seller_id = auth.uid()
    OR created_by = auth.uid()
    OR id IN (SELECT conversation_id FROM conversation_members WHERE user_id = auth.uid())
  );

-- 5. Mise à jour des politiques RLS de messages pour inclure les membres de groupe
DROP POLICY IF EXISTS "Messages visibles par les participants de la conversation" ON messages;
CREATE POLICY "Messages visibles par les participants de la conversation"
  ON messages FOR SELECT TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE buyer_id = auth.uid() OR seller_id = auth.uid()
    )
    OR
    conversation_id IN (
      SELECT conversation_id FROM conversation_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Participants peuvent envoyer un message" ON messages;
CREATE POLICY "Participants peuvent envoyer un message"
  ON messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND (
      conversation_id IN (
        SELECT id FROM conversations WHERE buyer_id = auth.uid() OR seller_id = auth.uid()
      )
      OR
      conversation_id IN (
        SELECT conversation_id FROM conversation_members WHERE user_id = auth.uid()
      )
    )
  );

-- 6. Fonctions RPC sécurisées pour la gestion des groupes

-- Créer un groupe
CREATE OR REPLACE FUNCTION create_group_conversation(
  p_title TEXT,
  p_description TEXT,
  p_avatar_url TEXT,
  p_member_ids UUID[]
)
RETURNS UUID AS $$
DECLARE
  v_conv_id UUID;
  v_member_id UUID;
  v_creator_id UUID := auth.uid();
  v_creator_name TEXT;
BEGIN
  IF v_creator_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF p_title IS NULL OR trim(p_title) = '' THEN
    RAISE EXCEPTION 'Le nom du groupe est obligatoire';
  END IF;

  -- 1. Créer la conversation de groupe
  INSERT INTO conversations (
    is_group,
    title,
    description,
    avatar_url,
    created_by,
    buyer_id,
    seller_id,
    last_message,
    last_message_at
  )
  VALUES (
    TRUE,
    p_title,
    p_description,
    p_avatar_url,
    v_creator_id,
    v_creator_id,
    v_creator_id,
    'Groupe créé',
    NOW()
  )
  RETURNING id INTO v_conv_id;

  -- 2. Ajouter le créateur comme ADMIN
  INSERT INTO conversation_members (conversation_id, user_id, role)
  VALUES (v_conv_id, v_creator_id, 'admin')
  ON CONFLICT DO NOTHING;

  -- 3. Ajouter les membres sélectionnés
  IF p_member_ids IS NOT NULL AND array_length(p_member_ids, 1) > 0 THEN
    FOREACH v_member_id IN ARRAY p_member_ids LOOP
      IF v_member_id <> v_creator_id THEN
        INSERT INTO conversation_members (conversation_id, user_id, role)
        VALUES (v_conv_id, v_member_id, 'member')
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  -- Récupérer le pseudo du créateur pour le message système
  SELECT COALESCE(username, 'Un utilisateur') INTO v_creator_name FROM profiles WHERE id = v_creator_id;

  -- 4. Insérer un premier message système
  INSERT INTO messages (
    conversation_id,
    sender_id,
    content,
    type
  )
  VALUES (
    v_conv_id,
    v_creator_id,
    '🎉 ' || v_creator_name || ' a créé le groupe "' || p_title || '"',
    'text'
  );

  RETURN v_conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ajouter des membres à un groupe existant
CREATE OR REPLACE FUNCTION add_group_members(
  p_conv_id UUID,
  p_user_ids UUID[]
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_is_member BOOLEAN;
  v_user_name TEXT;
  v_actor_name TEXT;
BEGIN
  -- Vérifier que l'utilisateur actuel est membre du groupe
  SELECT EXISTS (
    SELECT 1 FROM conversation_members WHERE conversation_id = p_conv_id AND user_id = auth.uid()
  ) INTO v_is_member;

  IF NOT v_is_member THEN
    RAISE EXCEPTION 'Action non autorisée';
  END IF;

  SELECT COALESCE(username, 'Un membre') INTO v_actor_name FROM profiles WHERE id = auth.uid();

  FOREACH v_user_id IN ARRAY p_user_ids LOOP
    INSERT INTO conversation_members (conversation_id, user_id, role)
    VALUES (p_conv_id, v_user_id, 'member')
    ON CONFLICT DO NOTHING;

    SELECT COALESCE(username, 'Un membre') INTO v_user_name FROM profiles WHERE id = v_user_id;

    -- Notification dans le chat
    INSERT INTO messages (conversation_id, sender_id, content, type)
    VALUES (p_conv_id, auth.uid(), v_actor_name || ' a ajouté ' || v_user_name || ' au groupe.', 'text');
  END LOOP;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Quitter un groupe
CREATE OR REPLACE FUNCTION leave_group_conversation(p_conv_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_name TEXT;
BEGIN
  SELECT COALESCE(username, 'Un membre') INTO v_user_name FROM profiles WHERE id = auth.uid();

  DELETE FROM conversation_members
  WHERE conversation_id = p_conv_id AND user_id = auth.uid();

  INSERT INTO messages (conversation_id, sender_id, content, type)
  VALUES (p_conv_id, auth.uid(), v_user_name || ' a quitté le groupe.', 'text');

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Récupérer les membres d'une conversation de groupe
CREATE OR REPLACE FUNCTION get_group_members(p_conv_id UUID)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  role TEXT,
  joined_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS user_id,
    p.username,
    p.avatar_url,
    cm.role,
    cm.joined_at
  FROM conversation_members cm
  JOIN profiles p ON p.id = cm.user_id
  WHERE cm.conversation_id = p_conv_id
  ORDER BY cm.role DESC, cm.joined_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
