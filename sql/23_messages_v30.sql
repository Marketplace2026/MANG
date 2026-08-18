-- ============================================================
-- MANG v3.0 — MESSAGERIE WORLD-CLASS (SEARCH, DELIVERED & PERFORMANCE)
-- Exécutez ce script dans l'éditeur SQL de Supabase
-- ============================================================

-- 1. Index GIN pour recherche textuelle rapide au sein des conversations
CREATE INDEX IF NOT EXISTS idx_messages_search_content ON messages USING gin(to_tsvector('french', COALESCE(content, '')));

-- 2. Index d'optimisation des requêtes de messagerie
CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON messages (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_participants ON conversations (buyer_id, seller_id, last_message_at DESC);

-- 3. RPC pour marquer les messages comme livrés
CREATE OR REPLACE FUNCTION mark_messages_delivered(p_conv_id UUID, p_receiver_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE messages
  SET delivery_status = 'delivered'
  WHERE conversation_id = p_conv_id
    AND sender_id != p_receiver_id
    AND delivery_status = 'sent';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RPC consolidée pour récupérer les conversations enrichies (Zero N+1 Query)
CREATE OR REPLACE FUNCTION get_user_conversations_v30(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', c.id,
      'shop_id', c.shop_id,
      'buyer_id', c.buyer_id,
      'seller_id', c.seller_id,
      'last_message', c.last_message,
      'last_message_at', c.last_message_at,
      'created_at', c.created_at,
      'shop', CASE WHEN s.id IS NOT NULL THEN jsonb_build_object('id', s.id, 'name', s.name, 'slug', s.slug, 'cover_url', s.cover_url) ELSE NULL END,
      'buyer', CASE WHEN b.id IS NOT NULL THEN jsonb_build_object('id', b.id, 'username', b.username, 'full_name', b.full_name, 'avatar_url', b.avatar_url, 'last_seen_at', b.last_seen_at) ELSE NULL END,
      'seller', CASE WHEN sel.id IS NOT NULL THEN jsonb_build_object('id', sel.id, 'username', sel.username, 'full_name', sel.full_name, 'avatar_url', sel.avatar_url, 'last_seen_at', sel.last_seen_at) ELSE NULL END,
      'unread_count', (
        SELECT COUNT(*) 
        FROM messages m 
        WHERE m.conversation_id = c.id 
          AND m.sender_id != p_user_id 
          AND (m.is_read IS NULL OR m.is_read = false)
      )
    )
    ORDER BY c.last_message_at DESC
  ), '[]'::jsonb)
  INTO v_result
  FROM conversations c
  LEFT JOIN shops s ON s.id = c.shop_id
  LEFT JOIN profiles b ON b.id = c.buyer_id
  LEFT JOIN profiles sel ON sel.id = c.seller_id
  WHERE c.buyer_id = p_user_id OR c.seller_id = p_user_id;

  RETURN v_result;
END;
$$;
