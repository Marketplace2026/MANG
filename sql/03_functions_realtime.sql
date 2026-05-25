-- ============================================================
-- MANG — Configuration Realtime Supabase
-- À exécuter après 02_rls_policies.sql
-- ============================================================

-- Activer la réplication temps réel sur les tables clés
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE shop_followers;
ALTER PUBLICATION supabase_realtime ADD TABLE shop_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE posts;
ALTER PUBLICATION supabase_realtime ADD TABLE post_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE post_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE wallets;

-- ============================================================
-- FONCTIONS UTILITAIRES (appelées depuis le frontend)
-- ============================================================

-- Transfert d'argent entre wallets (atomique)
CREATE OR REPLACE FUNCTION transfer_funds(
  p_sender_id UUID,
  p_receiver_wallet_number CHAR(10),
  p_amount BIGINT,
  p_pin_hash TEXT
)
RETURNS JSON AS $$
DECLARE
  v_sender_wallet wallets%ROWTYPE;
  v_receiver_wallet wallets%ROWTYPE;
  v_receipt_num TEXT;
BEGIN
  -- Vérifier l'expéditeur
  SELECT * INTO v_sender_wallet FROM wallets WHERE user_id = p_sender_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'wallet_not_found');
  END IF;

  -- Vérifier le PIN
  IF v_sender_wallet.pin_hash != p_pin_hash THEN
    RETURN json_build_object('success', false, 'error', 'invalid_pin');
  END IF;

  -- Vérifier le solde
  IF v_sender_wallet.balance_available < p_amount THEN
    RETURN json_build_object('success', false, 'error', 'insufficient_balance');
  END IF;

  -- Trouver le destinataire
  SELECT * INTO v_receiver_wallet FROM wallets WHERE wallet_number = p_receiver_wallet_number FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'receiver_not_found');
  END IF;

  -- Débiter l'expéditeur
  UPDATE wallets SET
    balance_available = balance_available - p_amount,
    balance_total = balance_total - p_amount
  WHERE id = v_sender_wallet.id;

  -- Créditer le destinataire
  UPDATE wallets SET
    balance_available = balance_available + p_amount,
    balance_total = balance_total + p_amount
  WHERE id = v_receiver_wallet.id;

  -- Enregistrer les transactions
  v_receipt_num := generate_receipt_number();
  INSERT INTO wallet_transactions (wallet_id, type, amount, balance_after, description, receipt_number)
  VALUES (
    v_sender_wallet.id, 'transfer_out', -p_amount,
    v_sender_wallet.balance_available - p_amount,
    'Transfert vers ' || p_receiver_wallet_number, v_receipt_num
  );

  INSERT INTO wallet_transactions (wallet_id, type, amount, balance_after, description, receipt_number)
  VALUES (
    v_receiver_wallet.id, 'transfer_in', p_amount,
    v_receiver_wallet.balance_available + p_amount,
    'Transfert reçu de ' || v_sender_wallet.wallet_number, generate_receipt_number()
  );

  RETURN json_build_object(
    'success', true,
    'receipt_number', v_receipt_num,
    'receiver_user_id', v_receiver_wallet.user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Passer une commande (avec escrow)
CREATE OR REPLACE FUNCTION place_order(
  p_buyer_id UUID,
  p_product_id UUID,
  p_quantity INTEGER,
  p_delivery_address TEXT,
  p_delivery_phone TEXT,
  p_note TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_product products%ROWTYPE;
  v_shop shops%ROWTYPE;
  v_buyer_wallet wallets%ROWTYPE;
  v_total BIGINT;
  v_commission BIGINT;
  v_net BIGINT;
  v_order_id UUID;
BEGIN
  -- Récupérer le produit
  SELECT * INTO v_product FROM products WHERE id = p_product_id AND is_available = true;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'product_not_found');
  END IF;

  -- Récupérer la boutique
  SELECT * INTO v_shop FROM shops WHERE id = v_product.shop_id;

  -- Vérifier que l'acheteur n'est pas le vendeur
  IF v_shop.owner_id = p_buyer_id THEN
    RETURN json_build_object('success', false, 'error', 'cannot_buy_own_product');
  END IF;

  -- Calculer les montants
  v_total := v_product.price * p_quantity;
  v_commission := v_total * 5 / 100;
  v_net := v_total - v_commission;

  -- Vérifier le solde de l'acheteur
  SELECT * INTO v_buyer_wallet FROM wallets WHERE user_id = p_buyer_id FOR UPDATE;
  IF v_buyer_wallet.balance_available < v_total THEN
    RETURN json_build_object('success', false, 'error', 'insufficient_balance');
  END IF;

  -- Bloquer les fonds (escrow)
  UPDATE wallets SET
    balance_available = balance_available - v_total,
    balance_reserved = balance_reserved + v_total
  WHERE user_id = p_buyer_id;

  -- Créer la commande
  INSERT INTO orders (
    buyer_id, seller_id, product_id, shop_id,
    quantity, unit_price, total_amount, commission, net_amount,
    delivery_address, delivery_phone, note, escrow_amount
  ) VALUES (
    p_buyer_id, v_shop.owner_id, p_product_id, v_shop.id,
    p_quantity, v_product.price, v_total, v_commission, v_net,
    p_delivery_address, p_delivery_phone, p_note, v_total
  ) RETURNING id INTO v_order_id;

  RETURN json_build_object(
    'success', true,
    'order_id', v_order_id,
    'total_amount', v_total
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Payer une commande acceptée
CREATE OR REPLACE FUNCTION pay_order(
  p_buyer_id UUID,
  p_order_id UUID,
  p_pin_hash TEXT
)
RETURNS JSON AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_buyer_wallet wallets%ROWTYPE;
  v_seller_wallet wallets%ROWTYPE;
  v_receipt_num TEXT;
BEGIN
  -- Récupérer la commande
  SELECT * INTO v_order FROM orders WHERE id = p_order_id AND buyer_id = p_buyer_id AND status = 'accepted';
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'order_not_found');
  END IF;

  -- Vérifier le PIN
  SELECT * INTO v_buyer_wallet FROM wallets WHERE user_id = p_buyer_id;
  IF v_buyer_wallet.pin_hash != p_pin_hash THEN
    RETURN json_build_object('success', false, 'error', 'invalid_pin');
  END IF;

  -- Libérer l'escrow et payer le vendeur
  UPDATE wallets SET
    balance_reserved = balance_reserved - v_order.escrow_amount,
    balance_total = balance_total - v_order.escrow_amount
  WHERE user_id = p_buyer_id;

  SELECT * INTO v_seller_wallet FROM wallets WHERE user_id = v_order.seller_id;
  UPDATE wallets SET
    balance_available = balance_available + v_order.net_amount,
    balance_total = balance_total + v_order.net_amount
  WHERE user_id = v_order.seller_id;

  -- Mettre à jour la commande
  UPDATE orders SET status = 'paid', escrow_amount = 0 WHERE id = p_order_id;

  -- Enregistrer les transactions
  v_receipt_num := generate_receipt_number();
  INSERT INTO wallet_transactions (wallet_id, type, amount, balance_after, description, receipt_number, reference_id)
  VALUES (
    v_buyer_wallet.id, 'order_payment', -v_order.total_amount,
    v_buyer_wallet.balance_total - v_order.total_amount,
    'Paiement commande #' || p_order_id::TEXT, v_receipt_num, p_order_id
  );

  INSERT INTO wallet_transactions (wallet_id, type, amount, balance_after, description, receipt_number, reference_id)
  VALUES (
    v_seller_wallet.id, 'order_received', v_order.net_amount,
    v_seller_wallet.balance_total + v_order.net_amount,
    'Paiement reçu commande #' || p_order_id::TEXT, generate_receipt_number(), p_order_id
  );

  RETURN json_build_object('success', true, 'receipt_number', v_receipt_num);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Refuser une commande (rembourse l'acheteur)
CREATE OR REPLACE FUNCTION refuse_order(
  p_seller_id UUID,
  p_order_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_order orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id AND seller_id = p_seller_id AND status = 'pending';
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'order_not_found');
  END IF;

  -- Rembourser l'acheteur
  UPDATE wallets SET
    balance_reserved = balance_reserved - v_order.escrow_amount,
    balance_available = balance_available + v_order.escrow_amount
  WHERE user_id = v_order.buyer_id;

  -- Mettre à jour la commande
  UPDATE orders SET status = 'refused', escrow_amount = 0 WHERE id = p_order_id;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Acheter des pièces
CREATE OR REPLACE FUNCTION buy_pieces(
  p_user_id UUID,
  p_pieces_count INTEGER
)
RETURNS JSON AS $$
DECLARE
  v_wallet wallets%ROWTYPE;
  v_cost BIGINT;
BEGIN
  v_cost := (p_pieces_count / 5) * 100; -- 5 pièces = 100 FCFA

  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  IF v_wallet.balance_available < v_cost THEN
    RETURN json_build_object('success', false, 'error', 'insufficient_balance');
  END IF;

  UPDATE wallets SET
    balance_available = balance_available - v_cost,
    balance_total = balance_total - v_cost
  WHERE user_id = p_user_id;

  UPDATE pieces SET balance = balance + p_pieces_count WHERE user_id = p_user_id;

  INSERT INTO wallet_transactions (wallet_id, type, amount, balance_after, description, receipt_number)
  VALUES (
    v_wallet.id, 'pieces_purchase', -v_cost,
    v_wallet.balance_available - v_cost,
    'Achat de ' || p_pieces_count || ' pièces', generate_receipt_number()
  );

  RETURN json_build_object('success', true, 'new_balance', (SELECT balance FROM pieces WHERE user_id = p_user_id));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
