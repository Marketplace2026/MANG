-- ============================================================
-- MANG — Migration 39 : Correction Définitive RLS Messagerie & Groupes
-- Résout l'erreur "infinite recursion detected in policy"
-- ============================================================

-- 1. Création des fonctions de contrôle SECURITY DEFINER (exécutées sans récursion RLS)
CREATE OR REPLACE FUNCTION is_conversation_member(p_conv_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_members
    WHERE conversation_id = p_conv_id AND user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION is_conversation_participant(p_conv_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversations
    WHERE id = p_conv_id AND (
      buyer_id = p_user_id 
      OR seller_id = p_user_id 
      OR created_by = p_user_id
    )
  ) OR EXISTS (
    SELECT 1 FROM conversation_members
    WHERE conversation_id = p_conv_id AND user_id = p_user_id
  );
$$;

-- 2. Nettoyer et réappliquer les politiques RLS sur conversation_members
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Membres peuvent voir les membres de leur conversation" ON conversation_members;
DROP POLICY IF EXISTS "Voir les membres de conversation" ON conversation_members;
CREATE POLICY "Voir les membres de conversation"
  ON conversation_members FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() 
    OR is_conversation_participant(conversation_id, auth.uid())
  );

DROP POLICY IF EXISTS "Admins ou créateurs peuvent ajouter des membres" ON conversation_members;
DROP POLICY IF EXISTS "Ajouter des membres dans conversation_members" ON conversation_members;
CREATE POLICY "Ajouter des membres dans conversation_members"
  ON conversation_members FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() 
    OR is_conversation_participant(conversation_id, auth.uid())
  );

DROP POLICY IF EXISTS "Admins ou membres peuvent quitter ou retirer" ON conversation_members;
DROP POLICY IF EXISTS "Supprimer des membres de conversation" ON conversation_members;
CREATE POLICY "Supprimer des membres de conversation"
  ON conversation_members FOR DELETE TO authenticated
  USING (
    user_id = auth.uid() 
    OR is_conversation_participant(conversation_id, auth.uid())
  );

-- 3. Nettoyer et réappliquer les politiques RLS sur conversations
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Conversation visible par ses participants" ON conversations;
DROP POLICY IF EXISTS "Conversations visibles par les participants" ON conversations;
CREATE POLICY "Conversation visible par ses participants"
  ON conversations FOR SELECT TO authenticated
  USING (
    buyer_id = auth.uid() 
    OR seller_id = auth.uid()
    OR created_by = auth.uid()
    OR is_conversation_member(id, auth.uid())
  );

DROP POLICY IF EXISTS "Acheteur ou vendeur peut créer une conversation" ON conversations;
DROP POLICY IF EXISTS "Créer une conversation" ON conversations;
CREATE POLICY "Créer une conversation"
  ON conversations FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = buyer_id 
    OR auth.uid() = seller_id 
    OR auth.uid() = created_by
  );

DROP POLICY IF EXISTS "Participants peuvent modifier la conversation" ON conversations;
DROP POLICY IF EXISTS "Modifier la conversation" ON conversations;
CREATE POLICY "Modifier la conversation"
  ON conversations FOR UPDATE TO authenticated
  USING (
    buyer_id = auth.uid() 
    OR seller_id = auth.uid() 
    OR created_by = auth.uid()
    OR is_conversation_member(id, auth.uid())
  );

DROP POLICY IF EXISTS "Participants peuvent supprimer leur conversation" ON conversations;
CREATE POLICY "Participants peuvent supprimer leur conversation"
  ON conversations FOR DELETE TO authenticated
  USING (
    buyer_id = auth.uid() 
    OR seller_id = auth.uid() 
    OR created_by = auth.uid()
  );

-- 4. Nettoyer et réappliquer les politiques RLS sur messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Messages visibles par les participants de la conversation" ON messages;
CREATE POLICY "Messages visibles par les participants de la conversation"
  ON messages FOR SELECT TO authenticated
  USING (
    is_conversation_participant(conversation_id, auth.uid())
  );

DROP POLICY IF EXISTS "Participants peuvent envoyer un message" ON messages;
DROP POLICY IF EXISTS "Participant peut envoyer un message" ON messages;
CREATE POLICY "Participants peuvent envoyer un message"
  ON messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id 
    AND is_conversation_participant(conversation_id, auth.uid())
  );

DROP POLICY IF EXISTS "Participants peuvent modifier un message" ON messages;
DROP POLICY IF EXISTS "Expéditeur peut modifier son message" ON messages;
CREATE POLICY "Participants peuvent modifier un message"
  ON messages FOR UPDATE TO authenticated
  USING (
    auth.uid() = sender_id 
    OR is_conversation_participant(conversation_id, auth.uid())
  );

DROP POLICY IF EXISTS "Expéditeur peut supprimer son message" ON messages;
CREATE POLICY "Expéditeur peut supprimer son message"
  ON messages FOR DELETE TO authenticated
  USING (
    auth.uid() = sender_id
  );

-- 5. Sécuriser le trigger de notification pour ne jamais bloquer l'envoi de messages
CREATE OR REPLACE FUNCTION notify_on_new_message()
RETURNS TRIGGER AS $$
DECLARE
  v_recipient_id UUID;
  v_sender_username TEXT;
  v_is_group BOOLEAN;
  v_member RECORD;
BEGIN
  BEGIN
    SELECT is_group, CASE WHEN buyer_id = NEW.sender_id THEN seller_id ELSE buyer_id END
    INTO v_is_group, v_recipient_id
    FROM conversations
    WHERE id = NEW.conversation_id;

    SELECT username INTO v_sender_username FROM profiles WHERE id = NEW.sender_id;

    IF v_is_group IS TRUE THEN
      -- Notification pour les membres du groupe sauf l'expéditeur
      FOR v_member IN 
        SELECT user_id FROM conversation_members 
        WHERE conversation_id = NEW.conversation_id AND user_id <> NEW.sender_id
      LOOP
        PERFORM create_notification(
          v_member.user_id,
          'new_message',
          '👥 Nouveau message dans le groupe',
          COALESCE(v_sender_username, 'Un membre') || ': ' || COALESCE(LEFT(NEW.content, 80), 'Nouveau message'),
          NEW.conversation_id,
          'conversation'
        );
      END LOOP;
    ELSIF v_recipient_id IS NOT NULL AND v_recipient_id <> NEW.sender_id THEN
      PERFORM create_notification(
        v_recipient_id,
        'new_message',
        '💬 Message de @' || COALESCE(v_sender_username, 'Utilisateur'),
        CASE 
          WHEN NEW.type = 'image' THEN '📷 Vous a envoyé une photo'
          WHEN NEW.type = 'audio' THEN '🎙️ Vous a envoyé une note vocale'
          WHEN NEW.type = 'video' THEN '🎥 Vous a envoyé une vidéo'
          WHEN NEW.type = 'file'  THEN '📎 Vous a envoyé un document'
          ELSE COALESCE(LEFT(NEW.content, 80), 'Nouveau message reçu')
        END,
        NEW.conversation_id,
        'conversation'
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- En cas d'erreur sur les notifications, ne jamais bloquer l'insertion du message
    NULL;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
