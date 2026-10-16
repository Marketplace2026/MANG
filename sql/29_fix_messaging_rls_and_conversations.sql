-- ============================================================
-- MANG — Migration 29 : Correction RLS, Conversations & Notifications Messagerie
-- ============================================================

-- 1. Rendre shop_id optionnel dans conversations pour permettre le chat direct d'utilisateur à utilisateur
ALTER TABLE conversations ALTER COLUMN shop_id DROP NOT NULL;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS buyer_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS seller_deleted BOOLEAN DEFAULT FALSE;

-- 2. Permettre la suppression de messages (Expéditeur peut supprimer son message)
DROP POLICY IF EXISTS "Expéditeur peut supprimer son message" ON messages;
CREATE POLICY "Expéditeur peut supprimer son message"
  ON messages FOR DELETE TO authenticated
  USING (auth.uid() = sender_id);

-- 3. Permettre aux participants de la conversation de mettre à jour les messages (Réactions emojis, statut de lecture)
DROP POLICY IF EXISTS "Expéditeur peut modifier son message" ON messages;
DROP POLICY IF EXISTS "Participants peuvent modifier un message" ON messages;
CREATE POLICY "Participants peuvent modifier un message"
  ON messages FOR UPDATE TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE buyer_id = auth.uid() OR seller_id = auth.uid()
    )
  );

-- 4. Permettre la suppression de conversation (ou masquage)
DROP POLICY IF EXISTS "Participants peuvent supprimer leur conversation" ON conversations;
CREATE POLICY "Participants peuvent supprimer leur conversation"
  ON conversations FOR DELETE TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- 5. RPC sécurisée pour supprimer ou masquer une conversation
CREATE OR REPLACE FUNCTION delete_conversation(p_conv_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_conv conversations%ROWTYPE;
BEGIN
  SELECT * INTO v_conv FROM conversations WHERE id = p_conv_id;
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF v_conv.buyer_id = p_user_id THEN
    UPDATE conversations SET buyer_deleted = TRUE WHERE id = p_conv_id;
  ELSIF v_conv.seller_id = p_user_id THEN
    UPDATE conversations SET seller_deleted = TRUE WHERE id = p_conv_id;
  ELSE
    RETURN FALSE;
  END IF;

  -- Si les deux participants ont supprimé, supprimer définitivement
  DELETE FROM conversations
  WHERE id = p_conv_id AND buyer_deleted = TRUE AND seller_deleted = TRUE;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trigger automatique pour créer une notification in-app lors d'un nouveau message
CREATE OR REPLACE FUNCTION notify_on_new_message()
RETURNS TRIGGER AS $$
DECLARE
  v_recipient_id UUID;
  v_sender_username TEXT;
BEGIN
  -- Trouver l'autre participant
  SELECT CASE WHEN buyer_id = NEW.sender_id THEN seller_id ELSE buyer_id END
  INTO v_recipient_id
  FROM conversations
  WHERE id = NEW.conversation_id;

  -- Trouver le nom d'utilisateur
  SELECT username INTO v_sender_username FROM profiles WHERE id = NEW.sender_id;

  IF v_recipient_id IS NOT NULL AND v_recipient_id != NEW.sender_id THEN
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_new_message ON messages;
CREATE TRIGGER trg_notify_new_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_new_message();
