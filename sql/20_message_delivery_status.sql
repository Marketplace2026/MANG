-- ============================================================
-- MIGRATION: STATUT DE LIVRAISON ET DE LECTURE DES MESSAGES
-- ============================================================

-- Création d'un type enum pour le statut de livraison si non existant
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_delivery_status') THEN
    CREATE TYPE message_delivery_status AS ENUM ('sent', 'delivered', 'read');
  END IF;
END
$$;

-- Ajout de la colonne delivery_status à la table messages
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS delivery_status message_delivery_status DEFAULT 'sent'::message_delivery_status;

-- Index pour accélérer le filtrage et la mise à jour des statuts
CREATE INDEX IF NOT EXISTS idx_messages_delivery_status ON public.messages(delivery_status);
