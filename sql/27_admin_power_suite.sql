-- ============================================================
-- MANG — Suite Administrateur Avancée (Audit, Broadcast, Escrow & Wallet Pro)
-- ============================================================

-- 1. Table des logs d'audit d'administration
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action       TEXT NOT NULL,
  target_type  TEXT,
  target_id    TEXT,
  details      JSONB DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.admin_audit_logs(action);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin peut tout faire sur audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admin peut tout faire sur audit logs"
  ON public.admin_audit_logs TO authenticated
  USING (auth.uid() = 'd9f97369-ae78-4da2-844c-1c9c97b12445'::uuid)
  WITH CHECK (auth.uid() = 'd9f97369-ae78-4da2-844c-1c9c97b12445'::uuid);

-- 2. Fonction RPC pour diffuser une notification générale à tous les utilisateurs (Broadcast)
CREATE OR REPLACE FUNCTION admin_broadcast_notification(
  p_title TEXT,
  p_body TEXT,
  p_type TEXT DEFAULT 'system'
)
RETURNS JSON AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  IF auth.uid() != 'd9f97369-ae78-4da2-844c-1c9c97b12445'::uuid THEN
    RAISE EXCEPTION 'Accès refusé : privilège super-administrateur requis.';
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, created_at)
  SELECT id, p_type, p_title, p_body, NOW()
  FROM public.profiles;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Enregistrement dans les logs d'audit
  INSERT INTO public.admin_audit_logs (admin_id, action, target_type, details)
  VALUES (
    auth.uid(),
    'broadcast_notification',
    'all_users',
    json_build_object('title', p_title, 'count', v_count)
  );

  RETURN json_build_object('success', true, 'sent_to', v_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Fonction RPC pour ajuster manuellement le portefeuille d'un utilisateur (Crédit / Débit)
CREATE OR REPLACE FUNCTION admin_adjust_wallet(
  p_target_user_id UUID,
  p_operation TEXT, -- 'credit' ou 'debit'
  p_amount BIGINT,
  p_reason TEXT
)
RETURNS JSON AS $$
DECLARE
  v_wallet RECORD;
  v_new_available BIGINT;
  v_new_total BIGINT;
  v_receipt TEXT;
BEGIN
  IF auth.uid() != 'd9f97369-ae78-4da2-844c-1c9c97b12445'::uuid THEN
    RAISE EXCEPTION 'Accès refusé : privilège super-administrateur requis.';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Le montant doit être supérieur à 0.';
  END IF;

  SELECT * INTO v_wallet FROM public.wallets WHERE user_id = p_target_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Portefeuille introuvable pour cet utilisateur.';
  END IF;

  IF p_operation = 'credit' THEN
    v_new_available := v_wallet.balance_available + p_amount;
    v_new_total := v_wallet.balance_total + p_amount;
  ELSIF p_operation = 'debit' THEN
    IF v_wallet.balance_available < p_amount THEN
      RAISE EXCEPTION 'Solde disponible insuffisant pour ce débit.';
    END IF;
    v_new_available := v_wallet.balance_available - p_amount;
    v_new_total := v_wallet.balance_total - p_amount;
  ELSE
    RAISE EXCEPTION 'Opération invalide. Utilisez "credit" ou "debit".';
  END IF;

  UPDATE public.wallets
  SET balance_available = v_new_available,
      balance_total = v_new_total,
      updated_at = NOW()
  WHERE id = v_wallet.id;

  v_receipt := 'MANG-ADJ-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 9999 + 1)::TEXT, 4, '0');

  INSERT INTO public.wallet_transactions (
    wallet_id, user_id, type, amount, balance_after, description, receipt_number, status
  ) VALUES (
    v_wallet.id,
    p_target_user_id,
    CASE WHEN p_operation = 'credit' THEN 'order_refund' ELSE 'order_payment' END,
    p_amount,
    v_new_available,
    'Ajustement administrateur : ' || p_reason,
    v_receipt,
    'completed'
  );

  INSERT INTO public.notifications (user_id, type, title, body)
  VALUES (
    p_target_user_id,
    CASE WHEN p_operation = 'credit' THEN 'wallet_credit' ELSE 'wallet_debit' END,
    CASE WHEN p_operation = 'credit' THEN 'Votre portefeuille a été crédité' ELSE 'Votre portefeuille a été débité' END,
    p_amount || ' FCFA ont été ' || CASE WHEN p_operation = 'credit' THEN 'ajoutés à' ELSE 'déduits de' END || ' votre solde MANG PAY. Motif : ' || p_reason
  );

  INSERT INTO public.admin_audit_logs (admin_id, action, target_type, target_id, details)
  VALUES (
    auth.uid(),
    'wallet_adjustment',
    'wallet',
    v_wallet.id::TEXT,
    json_build_object('operation', p_operation, 'amount', p_amount, 'reason', p_reason, 'user_id', p_target_user_id)
  );

  RETURN json_build_object('success', true, 'new_balance', v_new_available, 'receipt', v_receipt);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Fonction RPC pour forcer la libération du séquestre d'une commande (Escrow release)
CREATE OR REPLACE FUNCTION admin_release_escrow_order(
  p_order_id UUID,
  p_note TEXT DEFAULT 'Validation d''office par l''administration'
)
RETURNS JSON AS $$
DECLARE
  v_order RECORD;
  v_seller_wallet RECORD;
  v_net_amount BIGINT;
  v_receipt TEXT;
BEGIN
  IF auth.uid() != 'd9f97369-ae78-4da2-844c-1c9c97b12445'::uuid THEN
    RAISE EXCEPTION 'Accès refusé : privilège super-administrateur requis.';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commande introuvable.';
  END IF;

  IF v_order.status != 'paid' THEN
    RAISE EXCEPTION 'Cette commande n''est pas en attente de libération de séquestre (statut: %)', v_order.status;
  END IF;

  SELECT * INTO v_seller_wallet FROM public.wallets WHERE user_id = v_order.seller_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Portefeuille vendeur introuvable.';
  END IF;

  v_net_amount := COALESCE(v_order.net_amount, v_order.total_amount - COALESCE(v_order.commission, 0));

  -- Libérer les fonds du séquestre vers le solde disponible du vendeur
  UPDATE public.wallets
  SET balance_reserved = GREATEST(0, balance_reserved - v_order.total_amount),
      balance_available = balance_available + v_net_amount,
      balance_total = balance_total + v_net_amount,
      updated_at = NOW()
  WHERE id = v_seller_wallet.id;

  -- Marquer la commande comme livrée/complétée
  UPDATE public.orders
  SET status = 'accepted', -- ou statut de complétion
      note = COALESCE(note || ' • ', '') || p_note
  WHERE id = v_order.id;

  v_receipt := 'MANG-ESC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 9999 + 1)::TEXT, 4, '0');

  INSERT INTO public.wallet_transactions (
    wallet_id, user_id, type, amount, balance_after, description, receipt_number, status
  ) VALUES (
    v_seller_wallet.id,
    v_order.seller_id,
    'order_escrow_release',
    v_net_amount,
    v_seller_wallet.balance_available + v_net_amount,
    'Libération séquestre commande #' || SUBSTRING(p_order_id::TEXT FROM 1 FOR 8),
    v_receipt,
    'completed'
  );

  INSERT INTO public.notifications (user_id, type, title, body)
  VALUES (
    v_order.seller_id,
    'wallet_credit',
    'Séquestre libéré : Fonds reçus !',
    'Le paiement de ' || v_net_amount || ' FCFA pour votre commande a été transféré sur votre solde disponible.'
  );

  INSERT INTO public.admin_audit_logs (admin_id, action, target_type, target_id, details)
  VALUES (
    auth.uid(),
    'escrow_released',
    'order',
    p_order_id::TEXT,
    json_build_object('seller_id', v_order.seller_id, 'amount', v_net_amount, 'note', p_note)
  );

  RETURN json_build_object('success', true, 'released_amount', v_net_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
