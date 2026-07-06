-- ============================================================
-- MANG — PHASE 2 SCHEMA & FUNCTIONS
-- À exécuter dans Supabase pour ajouter les fonctionnalités e-commerce avancées
-- ============================================================

-- 1. Ajout de colonnes pour les variantes et ventes en gros dans products
ALTER TABLE products ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS wholesale_tiers JSONB DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT NULL;

-- 2. Ajout de colonnes pour les options de commande dans orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS variant_name TEXT DEFAULT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS applied_wholesale_discount BOOLEAN DEFAULT FALSE;

-- 3. Création de la table des avis produits (product_reviews)
CREATE TABLE IF NOT EXISTS product_reviews (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating          INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment         TEXT,
  photo_urls      TEXT[] DEFAULT '{}'::text[],
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, user_id)
);

-- Activation RLS pour product_reviews
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Avis lisibles par tous" ON product_reviews;
CREATE POLICY "Avis lisibles par tous" 
  ON product_reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Acheteur connecté peut publier un avis" ON product_reviews;
CREATE POLICY "Acheteur connecté peut publier un avis" 
  ON product_reviews FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Auteur peut modifier son avis" ON product_reviews;
CREATE POLICY "Auteur peut modifier son avis" 
  ON product_reviews FOR UPDATE TO authenticated 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Auteur peut supprimer son avis" ON product_reviews;
CREATE POLICY "Auteur peut supprimer son avis" 
  ON product_reviews FOR DELETE TO authenticated 
  USING (auth.uid() = user_id);

-- 4. Création de la table des litiges (disputes)
CREATE TABLE IF NOT EXISTS disputes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  initiator_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason          TEXT NOT NULL,
  description     TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'cancelled')),
  resolution_note TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Activation RLS pour disputes
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants de la commande et admin voient le litige" ON disputes;
CREATE POLICY "Participants de la commande et admin voient le litige"
  ON disputes FOR SELECT TO authenticated
  USING (
    auth.uid() = 'd9f97369-ae78-4da2-844c-1c9c97b12445'::uuid OR
    auth.uid() = initiator_id OR
    auth.uid() = (SELECT seller_id FROM orders WHERE id = order_id) OR
    auth.uid() = (SELECT buyer_id FROM orders WHERE id = order_id)
  );

DROP POLICY IF EXISTS "Acheteur ou Vendeur de la commande peut creer un litige" ON disputes;
CREATE POLICY "Acheteur ou Vendeur de la commande peut creer un litige"
  ON disputes FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = initiator_id AND (
      auth.uid() = (SELECT buyer_id FROM orders WHERE id = order_id) OR
      auth.uid() = (SELECT seller_id FROM orders WHERE id = order_id)
    )
  );

DROP POLICY IF EXISTS "Admin et initiateur peuvent modifier le litige" ON disputes;
CREATE POLICY "Admin et initiateur peuvent modifier le litige"
  ON disputes FOR UPDATE TO authenticated
  USING (
    auth.uid() = 'd9f97369-ae78-4da2-844c-1c9c97b12445'::uuid OR
    auth.uid() = initiator_id
  );

-- 5. Création de la table des devis grossistes (wholesale_quotes)
CREATE TABLE IF NOT EXISTS wholesale_quotes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seller_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity        INTEGER NOT NULL CHECK (quantity > 0),
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'responded', 'accepted', 'rejected')),
  proposed_price  BIGINT DEFAULT NULL, -- Prix unitaire proposé par le vendeur en FCFA
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- RLS pour wholesale_quotes
ALTER TABLE wholesale_quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Devis visibles par acheteur et vendeur" ON wholesale_quotes;
CREATE POLICY "Devis visibles par acheteur et vendeur"
  ON wholesale_quotes FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

DROP POLICY IF EXISTS "Acheteur peut creer une demande de devis" ON wholesale_quotes;
CREATE POLICY "Acheteur peut creer une demande de devis"
  ON wholesale_quotes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Participants peuvent mettre a jour le devis" ON wholesale_quotes;
CREATE POLICY "Participants peuvent mettre a jour le devis"
  ON wholesale_quotes FOR UPDATE TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- ============================================================
-- FONCTIONS RPC & TRIGGERS
-- ============================================================

-- 6. RPC place_order améliorée (gestion stocks, variantes, grossistes)
CREATE OR REPLACE FUNCTION place_order(
  p_buyer_id UUID,
  p_product_id UUID,
  p_quantity INTEGER,
  p_delivery_address TEXT,
  p_delivery_phone TEXT,
  p_note TEXT DEFAULT NULL,
  p_variant_name TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_product products%ROWTYPE;
  v_shop shops%ROWTYPE;
  v_buyer_wallet wallets%ROWTYPE;
  v_unit_price BIGINT;
  v_total BIGINT;
  v_commission BIGINT;
  v_net BIGINT;
  v_order_id UUID;
  v_variant JSONB;
  v_tier JSONB;
  v_found_variant BOOLEAN := FALSE;
  v_found_tier BOOLEAN := FALSE;
  v_stock_quantity INTEGER;
BEGIN
  -- Récupérer le produit
  SELECT * INTO v_product FROM products WHERE id = p_product_id AND is_available = true;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'product_not_found');
  END IF;

  -- Déterminer le prix unitaire de base (produit ou variante)
  v_unit_price := v_product.price;

  -- Si une variante est sélectionnée, chercher son prix et déduire le stock
  IF p_variant_name IS NOT NULL AND p_variant_name != '' THEN
    FOR v_variant IN SELECT jsonb_array_elements(v_product.variants) LOOP
      IF v_variant->>'name' = p_variant_name THEN
        v_unit_price := (v_variant->>'price')::BIGINT;
        v_found_variant := TRUE;
        -- Vérifier le stock de la variante si défini
        IF v_variant->'stock' IS NOT NULL AND (v_variant->>'stock') != 'null' THEN
          v_stock_quantity := (v_variant->>'stock')::INTEGER;
          IF v_stock_quantity < p_quantity THEN
            RETURN json_build_object('success', false, 'error', 'insufficient_variant_stock');
          END IF;
          -- Déduire le stock de la variante
          UPDATE products
          SET variants = (
            SELECT jsonb_agg(
              CASE
                WHEN elem->>'name' = p_variant_name THEN jsonb_set(elem, '{stock}', to_jsonb(v_stock_quantity - p_quantity))
                ELSE elem
              END
            )
            FROM jsonb_array_elements(variants) AS elem
          )
          WHERE id = p_product_id;
        END IF;
        EXIT;
      END IF;
    END LOOP;
  ELSE
    -- Vérifier le stock général si aucune variante
    IF v_product.stock_quantity IS NOT NULL THEN
      IF v_product.stock_quantity < p_quantity THEN
        RETURN json_build_object('success', false, 'error', 'insufficient_stock');
      END IF;
      -- Déduire le stock général
      UPDATE products SET stock_quantity = stock_quantity - p_quantity WHERE id = p_product_id;
    END IF;
  END IF;

  -- Appliquer les prix dégressifs (wholesale tiers)
  IF v_product.wholesale_tiers IS NOT NULL AND jsonb_array_length(v_product.wholesale_tiers) > 0 THEN
    SELECT elem INTO v_tier
    FROM jsonb_array_elements(v_product.wholesale_tiers) AS elem
    WHERE p_quantity >= (elem->>'min_qty')::INTEGER
    ORDER BY (elem->>'min_qty')::INTEGER DESC
    LIMIT 1;

    IF v_tier IS NOT NULL THEN
      v_unit_price := (v_tier->>'price')::BIGINT;
      v_found_tier := TRUE;
    END IF;
  END IF;

  -- Récupérer la boutique
  SELECT * INTO v_shop FROM shops WHERE id = v_product.shop_id;

  -- Vérifier que l'acheteur n'est pas le vendeur
  IF v_shop.owner_id = p_buyer_id THEN
    RETURN json_build_object('success', false, 'error', 'cannot_buy_own_product');
  END IF;

  -- Calculer les montants
  v_total := v_unit_price * p_quantity;
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
    delivery_address, delivery_phone, note, escrow_amount,
    variant_name, applied_wholesale_discount
  ) VALUES (
    p_buyer_id, v_shop.owner_id, p_product_id, v_shop.id,
    p_quantity, v_unit_price, v_total, v_commission, v_net,
    p_delivery_address, p_delivery_phone, p_note, v_total,
    p_variant_name, v_found_tier
  ) RETURNING id INTO v_order_id;

  -- Notifier le vendeur
  PERFORM create_notification(
    v_shop.owner_id,
    'order_new',
    '📦 Nouvelle commande !',
    'Vous avez reçu une commande de ' || p_quantity || 'x ' || v_product.name || ' pour ' || (v_total/100) || ' FCFA.',
    v_order_id,
    'order'
  );

  RETURN json_build_object(
    'success', true,
    'order_id', v_order_id,
    'total_amount', v_total
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RPC resolve_dispute (Arbitrage Admin de litige)
CREATE OR REPLACE FUNCTION resolve_dispute(
  p_dispute_id UUID,
  p_decision TEXT, -- 'refund_buyer' (rembourser) ou 'pay_seller' (payer vendeur)
  p_resolution_note TEXT
)
RETURNS JSON AS $$
DECLARE
  v_dispute disputes%ROWTYPE;
  v_order orders%ROWTYPE;
  v_buyer_wallet wallets%ROWTYPE;
  v_seller_wallet wallets%ROWTYPE;
  v_receipt_num TEXT;
BEGIN
  -- Sécurité : Seul l'administrateur peut arbitrer
  IF auth.uid() != 'd9f97369-ae78-4da2-844c-1c9c97b12445'::uuid THEN
    RETURN json_build_object('success', false, 'error', 'unauthorized');
  END IF;

  -- Charger le litige
  SELECT * INTO v_dispute FROM disputes WHERE id = p_dispute_id AND status = 'open';
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'dispute_not_found_or_closed');
  END IF;

  -- Charger la commande
  SELECT * INTO v_order FROM orders WHERE id = v_dispute.order_id;

  -- 1. CAS REMBOURSEMENT ACHETEUR
  IF p_decision = 'refund_buyer' THEN
    -- Mettre à jour les wallets : Libérer l'escrow de l'acheteur vers son disponible
    UPDATE wallets SET
      balance_reserved = balance_reserved - v_order.escrow_amount,
      balance_available = balance_available + v_order.escrow_amount
    WHERE user_id = v_order.buyer_id;

    -- Mettre à jour la commande
    UPDATE orders SET status = 'refused', escrow_amount = 0 WHERE id = v_order.id;

    -- Notifier les participants
    PERFORM create_notification(
      v_order.buyer_id,
      'order_refused',
      '⚖️ Litige résolu : Remboursement',
      'Votre litige a été résolu. Le montant de la commande vous a été remboursé sur votre Wallet.',
      v_order.id,
      'order'
    );
    PERFORM create_notification(
      v_order.seller_id,
      'order_refused',
      '⚖️ Litige résolu : Remboursement',
      'Le litige a été résolu par l''administrateur. L''acheteur a été remboursé.',
      v_order.id,
      'order'
    );

  -- 2. CAS PAIEMENT VENDEUR
  ELSIF p_decision = 'pay_seller' THEN
    -- Libérer l'escrow de l'acheteur (débiter son reserved/total)
    UPDATE wallets SET
      balance_reserved = balance_reserved - v_order.escrow_amount,
      balance_total = balance_total - v_order.escrow_amount
    WHERE user_id = v_order.buyer_id;

    -- Créditer le vendeur
    UPDATE wallets SET
      balance_available = balance_available + v_order.net_amount,
      balance_total = balance_total + v_order.net_amount
    WHERE user_id = v_order.seller_id;

    -- Mettre à jour la commande
    UPDATE orders SET status = 'paid', escrow_amount = 0 WHERE id = v_order.id;

    -- Enregistrer les transactions
    v_receipt_num := generate_receipt_number();
    SELECT * INTO v_buyer_wallet FROM wallets WHERE user_id = v_order.buyer_id;
    SELECT * INTO v_seller_wallet FROM wallets WHERE user_id = v_order.seller_id;

    INSERT INTO wallet_transactions (wallet_id, type, amount, balance_after, description, receipt_number, reference_id)
    VALUES (
      v_buyer_wallet.id, 'order_payment', -v_order.total_amount,
      v_buyer_wallet.balance_total,
      'Arbitrage litige - Paiement commande #' || v_order.id::TEXT, v_receipt_num, v_order.id
    );

    INSERT INTO wallet_transactions (wallet_id, type, amount, balance_after, description, receipt_number, reference_id)
    VALUES (
      v_seller_wallet.id, 'order_received', v_order.net_amount,
      v_seller_wallet.balance_total,
      'Arbitrage litige - Paiement reçu commande #' || v_order.id::TEXT, generate_receipt_number(), v_order.id
    );

    -- Notifier les participants
    PERFORM create_notification(
      v_order.buyer_id,
      'order_paid',
      '⚖️ Litige résolu : Commande validée',
      'Le litige a été résolu par l''administrateur. Les fonds ont été versés au vendeur.',
      v_order.id,
      'order'
    );
    PERFORM create_notification(
      v_order.seller_id,
      'order_paid',
      '⚖️ Litige résolu : Paiement versé',
      'Votre litige a été résolu. Le paiement net de la commande a été crédité sur votre Wallet.',
      v_order.id,
      'order'
    );

  ELSE
    RETURN json_build_object('success', false, 'error', 'invalid_decision');
  END IF;

  -- Mettre à jour le litige
  UPDATE disputes SET
    status = 'resolved',
    resolution_note = p_resolution_note,
    updated_at = NOW()
  WHERE id = p_dispute_id;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. RPC create_wholesale_quote (Soumettre devis)
CREATE OR REPLACE FUNCTION create_wholesale_quote(
  p_buyer_id UUID,
  p_product_id UUID,
  p_quantity INTEGER,
  p_description TEXT
)
RETURNS JSON AS $$
DECLARE
  v_product products%ROWTYPE;
  v_shop shops%ROWTYPE;
  v_quote_id UUID;
BEGIN
  -- Charger le produit
  SELECT * INTO v_product FROM products WHERE id = p_product_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'product_not_found');
  END IF;

  -- Charger la boutique
  SELECT * INTO v_shop FROM shops WHERE id = v_product.shop_id;

  -- Insérer la demande
  INSERT INTO wholesale_quotes (buyer_id, seller_id, product_id, quantity, description)
  VALUES (p_buyer_id, v_shop.owner_id, p_product_id, p_quantity, p_description)
  RETURNING id INTO v_quote_id;

  -- Notifier le vendeur
  PERFORM create_notification(
    v_shop.owner_id,
    'new_message',
    '📥 Nouvelle demande de devis !',
    'Un grossiste demande un devis pour ' || p_quantity || 'x ' || v_product.name || '.',
    v_quote_id,
    'product'
  );

  RETURN json_build_object('success', true, 'quote_id', v_quote_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. RPC respond_wholesale_quote (Vendeur répond au devis)
CREATE OR REPLACE FUNCTION respond_wholesale_quote(
  p_quote_id UUID,
  p_seller_id UUID,
  p_proposed_price BIGINT,
  p_status TEXT -- 'responded' ou 'rejected'
)
RETURNS JSON AS $$
DECLARE
  v_quote wholesale_quotes%ROWTYPE;
  v_product products%ROWTYPE;
BEGIN
  -- Charger le devis
  SELECT * INTO v_quote FROM wholesale_quotes WHERE id = p_quote_id AND seller_id = p_seller_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'quote_not_found');
  END IF;

  SELECT * INTO v_product FROM products WHERE id = v_quote.product_id;

  -- Mettre à jour
  UPDATE wholesale_quotes
  SET status = p_status,
      proposed_price = p_proposed_price,
      updated_at = NOW()
  WHERE id = p_quote_id;

  -- Notifier l'acheteur
  PERFORM create_notification(
    v_quote.buyer_id,
    'new_message',
    CASE p_status
      WHEN 'responded' THEN '🏷️ Proposition de devis reçue !'
      ELSE '❌ Demande de devis rejetée'
    END,
    CASE p_status
      WHEN 'responded' THEN 'Le vendeur propose un prix de ' || p_proposed_price || ' FCFA/unité pour ' || v_product.name || '.'
      ELSE 'Le vendeur a décliné votre demande de devis pour ' || v_product.name || '.'
    END,
    p_quote_id,
    'product'
  );

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
