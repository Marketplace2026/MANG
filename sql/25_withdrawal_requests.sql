-- ============================================================
-- 25. GESTION SÉCURISÉE DES RETRAITS (WITHDRAWAL REQUESTS)
-- ============================================================

-- 1. Assurer que 'withdraw' et 'deposit' sont autorisés dans wallet_transactions
DO $$
BEGIN
  ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;
  ALTER TABLE wallet_transactions ADD CONSTRAINT wallet_transactions_type_check CHECK (
    type IN ('deposit','recharge','withdraw','transfer_in','transfer_out','order_payment',
             'order_refund','order_received','subscription','pieces_purchase')
  );
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 2. Ajouter la colonne status à wallet_transactions si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallet_transactions' AND column_name = 'status'
  ) THEN
    ALTER TABLE wallet_transactions ADD COLUMN status TEXT DEFAULT 'completed';
  END IF;
END $$;

-- 3. Table des demandes de retrait
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL,
  operator TEXT NOT NULL,
  phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  receipt_number TEXT,
  transaction_id UUID REFERENCES wallet_transactions(id),
  admin_note TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user ON withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_created ON withdrawal_requests(created_at DESC);

-- 4. Sécurité Row Level Security (RLS)
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Lecture : Les utilisateurs voient leurs propres demandes
DROP POLICY IF EXISTS "Users can view own withdrawal requests" ON withdrawal_requests;
CREATE POLICY "Users can view own withdrawal requests"
  ON withdrawal_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Insertion : Les utilisateurs authentifiés peuvent créer une demande pour leur compte
DROP POLICY IF EXISTS "Users can insert own withdrawal requests" ON withdrawal_requests;
CREATE POLICY "Users can insert own withdrawal requests"
  ON withdrawal_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Gestion complète pour les administrateurs
DROP POLICY IF EXISTS "Admins can manage all withdrawal requests" ON withdrawal_requests;
CREATE POLICY "Admins can manage all withdrawal requests"
  ON withdrawal_requests FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND (profiles.is_admin = true OR profiles.id = 'd9f97369-ae78-4da2-844c-1c9c97b12445')
    )
  );

-- Permettre également la lecture publique/authentifiée si profil admin
GRANT ALL ON withdrawal_requests TO authenticated;
GRANT ALL ON withdrawal_requests TO service_role;
