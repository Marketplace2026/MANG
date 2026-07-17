-- ============================================================
-- MIGRATION: SYSTEME DE BLOCAGE UTILISATEURS (MESSAGERIE)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_blocks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, blocked_id)
);

-- Index pour accélérer la recherche des blocages
CREATE INDEX IF NOT EXISTS idx_user_blocks_search ON public.user_blocks(user_id, blocked_id);

-- RLS de sécurité
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Les utilisateurs peuvent voir qui ils ont bloqué"
  ON public.user_blocks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent bloquer quelqu'un"
  ON public.user_blocks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent débloquer quelqu'un"
  ON public.user_blocks FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger ou contrainte sur les messages : empêcher d'envoyer un message si bloqué
CREATE OR REPLACE FUNCTION public.check_message_blocks()
RETURNS TRIGGER AS $$
BEGIN
  -- Vérifier si l'expéditeur a été bloqué par le destinataire (ou inversement)
  -- Nous devons trouver qui est l'autre personne dans la conversation
  IF EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = NEW.conversation_id
      AND (
        -- Si l'expéditeur est l'acheteur, le destinataire est le vendeur, et vice-versa
        (c.buyer_id = NEW.sender_id AND (
          EXISTS (SELECT 1 FROM public.user_blocks WHERE user_id = c.seller_id AND blocked_id = NEW.sender_id) OR
          EXISTS (SELECT 1 FROM public.user_blocks WHERE user_id = NEW.sender_id AND blocked_id = c.seller_id)
        ))
        OR
        (c.seller_id = NEW.sender_id AND (
          EXISTS (SELECT 1 FROM public.user_blocks WHERE user_id = c.buyer_id AND blocked_id = NEW.sender_id) OR
          EXISTS (SELECT 1 FROM public.user_blocks WHERE user_id = NEW.sender_id AND blocked_id = c.buyer_id)
        ))
      )
  ) THEN
    RAISE EXCEPTION 'Vous ne pouvez pas envoyer de message à cet utilisateur car un blocage est actif.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_check_message_blocks
  BEFORE INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.check_message_blocks();
