-- ============================================================
-- MANG — Migration 33: Correction & Amélioration Complète du Panel Admin
-- ============================================================

-- 1. Fonction centrale de vérification des privilèges administrateur
CREATE OR REPLACE FUNCTION public.is_admin_user(p_uid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_admin BOOLEAN := FALSE;
BEGIN
  IF p_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Super-admin Master ID de secours
  IF p_uid = 'd9f97369-ae78-4da2-844c-1c9c97b12445'::uuid THEN
    RETURN TRUE;
  END IF;

  -- Vérification dynamique sur le profil
  SELECT (COALESCE(is_admin, FALSE) = TRUE OR COALESCE(role, '') = 'admin')
  INTO v_is_admin
  FROM public.profiles
  WHERE id = p_uid;

  RETURN COALESCE(v_is_admin, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2. Colonnes requises sur profiles, shops et products
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ban_reason TEXT;

ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT TRUE;

-- Marquer le super-admin par défaut
UPDATE public.profiles SET is_admin = TRUE WHERE id = 'd9f97369-ae78-4da2-844c-1c9c97b12445'::uuid;

-- 3. RLS : PROFILES
DROP POLICY IF EXISTS "Admin peut modifier tout profil" ON public.profiles;
CREATE POLICY "Admin peut modifier tout profil"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.is_admin_user(auth.uid()))
  WITH CHECK (auth.uid() = id OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Admin peut supprimer un profil" ON public.profiles;
CREATE POLICY "Admin peut supprimer un profil"
  ON public.profiles FOR DELETE TO authenticated
  USING (public.is_admin_user(auth.uid()));

-- 4. RLS : SHOPS
DROP POLICY IF EXISTS "Admin peut modifier toute boutique" ON public.shops;
CREATE POLICY "Admin peut modifier toute boutique"
  ON public.shops FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id OR public.is_admin_user(auth.uid()))
  WITH CHECK (auth.uid() = owner_id OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Admin peut supprimer toute boutique" ON public.shops;
CREATE POLICY "Admin peut supprimer toute boutique"
  ON public.shops FOR DELETE TO authenticated
  USING (auth.uid() = owner_id OR public.is_admin_user(auth.uid()));

-- 5. RLS : PRODUCTS
DROP POLICY IF EXISTS "Admin peut modifier tout produit" ON public.products;
CREATE POLICY "Admin peut modifier tout produit"
  ON public.products FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM shops WHERE id = shop_id AND owner_id = auth.uid())
    OR public.is_admin_user(auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM shops WHERE id = shop_id AND owner_id = auth.uid())
    OR public.is_admin_user(auth.uid())
  );

DROP POLICY IF EXISTS "Admin peut supprimer tout produit" ON public.products;
CREATE POLICY "Admin peut supprimer tout produit"
  ON public.products FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM shops WHERE id = shop_id AND owner_id = auth.uid())
    OR public.is_admin_user(auth.uid())
  );

-- 6. RLS : POSTS & COMMENTS
DROP POLICY IF EXISTS "Admin peut modifier tout post" ON public.posts;
CREATE POLICY "Admin peut modifier tout post"
  ON public.posts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin_user(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Admin peut supprimer tout post" ON public.posts;
CREATE POLICY "Admin peut supprimer tout post"
  ON public.posts FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin_user(auth.uid()));

-- 7. RLS : WALLETS & TRANSACTIONS
DROP POLICY IF EXISTS "Admin peut voir tous les wallets" ON public.wallets;
CREATE POLICY "Admin peut voir tous les wallets"
  ON public.wallets FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Admin peut modifier tous les wallets" ON public.wallets;
CREATE POLICY "Admin peut modifier tous les wallets"
  ON public.wallets FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin_user(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Admin peut voir toutes les transactions" ON public.wallet_transactions;
CREATE POLICY "Admin peut voir toutes les transactions"
  ON public.wallet_transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin_user(auth.uid()));

-- 8. RLS : AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action       TEXT NOT NULL,
  target_type  TEXT,
  target_id    TEXT,
  details      JSONB DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin peut tout faire sur audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admin peut tout faire sur audit logs"
  ON public.admin_audit_logs TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

-- 9. RPC : Promouvoir / Révoquer Admin
CREATE OR REPLACE FUNCTION admin_toggle_admin_role(p_target_user_id UUID, p_is_admin BOOLEAN)
RETURNS JSON AS $$
BEGIN
  IF NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Accès refusé : privilège administrateur requis.';
  END IF;

  UPDATE public.profiles
  SET is_admin = p_is_admin,
      role = CASE WHEN p_is_admin THEN 'admin' ELSE 'user' END
  WHERE id = p_target_user_id;

  INSERT INTO public.admin_audit_logs (admin_id, action, target_type, target_id, details)
  VALUES (
    auth.uid(),
    CASE WHEN p_is_admin THEN 'admin_promoted' ELSE 'admin_demoted' END,
    'profile',
    p_target_user_id::TEXT,
    json_build_object('new_is_admin', p_is_admin)
  );

  RETURN json_build_object('success', true, 'is_admin', p_is_admin);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. RPC : Suppression propre d'un utilisateur (Profiles + Auth Users)
CREATE OR REPLACE FUNCTION admin_delete_user(p_target_user_id UUID)
RETURNS JSON AS $$
BEGIN
  IF NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Accès refusé : privilège administrateur requis.';
  END IF;

  -- Suppression du profil public
  DELETE FROM public.profiles WHERE id = p_target_user_id;

  -- Suppression dans auth.users pour éviter les comptes fantômes
  BEGIN
    DELETE FROM auth.users WHERE id = p_target_user_id;
  EXCEPTION WHEN OTHERS THEN
    -- Continue si permissions restreintes sur auth.users
    NULL;
  END;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. RPC : Ajustement manuel de portefeuille
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
  IF NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Accès refusé : privilège administrateur requis.';
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

-- 12. RPC : Libération de séquestre (Escrow Release)
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
  IF NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Accès refusé : privilège administrateur requis.';
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

  -- Libérer le séquestre vers le solde disponible du vendeur
  UPDATE public.wallets
  SET balance_reserved = GREATEST(0, balance_reserved - v_order.total_amount),
      balance_available = balance_available + v_net_amount,
      balance_total = balance_available + v_net_amount + GREATEST(0, balance_reserved - v_order.total_amount),
      updated_at = NOW()
  WHERE id = v_seller_wallet.id;

  UPDATE public.orders
  SET status = 'accepted',
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
    'Séquestre libéré : Paiement reçu !',
    'Le paiement de ' || v_net_amount || ' FCFA pour la commande #' || SUBSTRING(p_order_id::TEXT FROM 1 FOR 8) || ' a été versé sur votre compte MANG PAY.'
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

-- 13. RPC : Diffusion de notification à tous les membres (Broadcast)
CREATE OR REPLACE FUNCTION admin_broadcast_notification(
  p_title TEXT,
  p_body TEXT,
  p_type TEXT DEFAULT 'system'
)
RETURNS JSON AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  IF NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Accès refusé : privilège administrateur requis.';
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, created_at)
  SELECT id, p_type, p_title, p_body, NOW()
  FROM public.profiles;

  GET DIAGNOSTICS v_count = ROW_COUNT;

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

-- 14. RPC : Arbitrage de litige corrigé (resolve_dispute)
CREATE OR REPLACE FUNCTION public.resolve_dispute(
  p_dispute_id UUID,
  p_decision TEXT, -- 'refund_buyer' ou 'pay_seller'
  p_resolution_note TEXT
)
RETURNS JSON AS $$
DECLARE
  v_dispute disputes%ROWTYPE;
  v_order orders%ROWTYPE;
  v_buyer_wallet wallets%ROWTYPE;
  v_seller_wallet wallets%ROWTYPE;
  v_net_amount BIGINT;
  v_receipt TEXT;
BEGIN
  IF NOT public.is_admin_user(auth.uid()) THEN
    RETURN json_build_object('success', false, 'error', 'Accès refusé : privilège administrateur requis.');
  END IF;

  SELECT * INTO v_dispute FROM public.disputes WHERE id = p_dispute_id AND status = 'open';
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Litige introuvable ou déjà résolu.');
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = v_dispute.order_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Commande associée introuvable.');
  END IF;

  -- 1. CAS REMBOURSEMENT ACHETEUR
  IF p_decision = 'refund_buyer' THEN
    SELECT * INTO v_buyer_wallet FROM public.wallets WHERE user_id = v_order.buyer_id;
    IF FOUND THEN
      UPDATE public.wallets
      SET balance_available = balance_available + v_order.total_amount,
          balance_total = balance_total + v_order.total_amount,
          updated_at = NOW()
      WHERE id = v_buyer_wallet.id;

      v_receipt := 'MANG-DISP-REF-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 9999 + 1)::TEXT, 4, '0');

      INSERT INTO public.wallet_transactions (
        wallet_id, user_id, type, amount, balance_after, description, receipt_number, status
      ) VALUES (
        v_buyer_wallet.id,
        v_order.buyer_id,
        'order_refund',
        v_order.total_amount,
        v_buyer_wallet.balance_available + v_order.total_amount,
        'Remboursement suite arbitrage litige #' || SUBSTRING(p_dispute_id::TEXT FROM 1 FOR 8),
        v_receipt,
        'completed'
      );
    END IF;

    -- Si le montant avait été réservé chez le vendeur, déduire du reserved
    UPDATE public.wallets
    SET balance_reserved = GREATEST(0, balance_reserved - v_order.total_amount)
    WHERE user_id = v_order.seller_id;

    -- Mettre à jour la commande
    UPDATE public.orders SET status = 'refused', note = COALESCE(note || ' • ', '') || 'Litige résolu en faveur de l''acheteur' WHERE id = v_order.id;

    -- Clôturer le litige
    UPDATE public.disputes
    SET status = 'resolved',
        decision = 'refund_buyer',
        resolution_note = p_resolution_note,
        resolved_at = NOW()
    WHERE id = p_dispute_id;

    -- Notifications
    INSERT INTO public.notifications (user_id, type, title, body)
    VALUES (
      v_order.buyer_id,
      'order_refund',
      'Litige résolu : Vous avez été remboursé(e)',
      'Le litige sur la commande #' || SUBSTRING(v_order.id::TEXT FROM 1 FOR 8) || ' a été tranché en votre faveur. ' || v_order.total_amount || ' FCFA ont été recrédités sur votre Wallet.'
    );

    INSERT INTO public.notifications (user_id, type, title, body)
    VALUES (
      v_order.seller_id,
      'order_refused',
      'Litige résolu : Remboursement acheteur',
      'L''arbitrage a décidé du remboursement de l''acheteur pour la commande #' || SUBSTRING(v_order.id::TEXT FROM 1 FOR 8) || '. Motif : ' || p_resolution_note
    );

  -- 2. CAS PAIEMENT VENDEUR
  ELSIF p_decision = 'pay_seller' THEN
    SELECT * INTO v_seller_wallet FROM public.wallets WHERE user_id = v_order.seller_id;
    IF NOT FOUND THEN
      RETURN json_build_object('success', false, 'error', 'Portefeuille vendeur introuvable.');
    END IF;

    v_net_amount := COALESCE(v_order.net_amount, v_order.total_amount - COALESCE(v_order.commission, 0));

    UPDATE public.wallets
    SET balance_reserved = GREATEST(0, balance_reserved - v_order.total_amount),
        balance_available = balance_available + v_net_amount,
        balance_total = balance_available + v_net_amount + GREATEST(0, balance_reserved - v_order.total_amount),
        updated_at = NOW()
    WHERE id = v_seller_wallet.id;

    UPDATE public.orders SET status = 'accepted', note = COALESCE(note || ' • ', '') || 'Litige résolu en faveur du vendeur' WHERE id = v_order.id;

    UPDATE public.disputes
    SET status = 'resolved',
        decision = 'pay_seller',
        resolution_note = p_resolution_note,
        resolved_at = NOW()
    WHERE id = p_dispute_id;

    v_receipt := 'MANG-DISP-PAY-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 9999 + 1)::TEXT, 4, '0');

    INSERT INTO public.wallet_transactions (
      wallet_id, user_id, type, amount, balance_after, description, receipt_number, status
    ) VALUES (
      v_seller_wallet.id,
      v_order.seller_id,
      'order_escrow_release',
      v_net_amount,
      v_seller_wallet.balance_available + v_net_amount,
      'Paiement vendeur suite arbitrage litige #' || SUBSTRING(p_dispute_id::TEXT FROM 1 FOR 8),
      v_receipt,
      'completed'
    );

    INSERT INTO public.notifications (user_id, type, title, body)
    VALUES (
      v_order.seller_id,
      'wallet_credit',
      'Litige résolu : Paiement débloqué !',
      'L''arbitrage a validé votre commande #' || SUBSTRING(v_order.id::TEXT FROM 1 FOR 8) || '. Le montant net de ' || v_net_amount || ' FCFA a été versé sur votre compte.'
    );

    INSERT INTO public.notifications (user_id, type, title, body)
    VALUES (
      v_order.buyer_id,
      'system',
      'Litige résolu : Paiement confirmé au vendeur',
      'L''arbitrage a conclu à la conformité de la transaction pour la commande #' || SUBSTRING(v_order.id::TEXT FROM 1 FOR 8) || '. Motif : ' || p_resolution_note
    );
  ELSE
    RETURN json_build_object('success', false, 'error', 'Décision invalide. Utilisez "refund_buyer" ou "pay_seller".');
  END IF;

  INSERT INTO public.admin_audit_logs (admin_id, action, target_type, target_id, details)
  VALUES (
    auth.uid(),
    'dispute_resolved',
    'dispute',
    p_dispute_id::TEXT,
    json_build_object('decision', p_decision, 'note', p_resolution_note, 'order_id', v_order.id)
  );

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
