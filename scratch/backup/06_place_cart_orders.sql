-- 6. Fonction RPC place_cart_orders pour MANG
-- Permet de passer commande pour l'ensemble du panier de manière atomique (une commande par produit/boutique)
-- Gère la validation des stocks, les prix de gros et le débit unique du Wallet

CREATE OR REPLACE FUNCTION place_cart_orders(
  p_buyer_id UUID,
  p_items JSONB, -- tableau de { product_id: UUID, qty: INTEGER, variant_name: TEXT | NULL }
  p_delivery_address TEXT,
  p_delivery_phone TEXT
)
RETURNS JSON AS $$
DECLARE
  v_item JSONB;
  v_product_id UUID;
  v_quantity INTEGER;
  v_variant_name TEXT;
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
  v_found_variant BOOLEAN;
  v_found_tier BOOLEAN;
  v_stock_quantity INTEGER;
  v_grand_total BIGINT := 0;
  v_created_orders JSONB := '[]'::JSONB;
BEGIN
  -- 1. CALCULER LE TOTAL GLOBAL ET VALIDER LES DISPONIBILITÉS EN AMONT
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_quantity := (v_item->>'qty')::INTEGER;
    v_variant_name := v_item->>'variant_name';

    -- Récupérer le produit
    SELECT * INTO v_product FROM products WHERE id = v_product_id AND is_available = true;
    IF NOT FOUND THEN
      RETURN json_build_object('success', false, 'error', 'product_not_found', 'product_id', v_product_id);
    END IF;

    -- Déterminer le prix unitaire de base (produit ou variante)
    v_unit_price := v_product.price;
    IF v_variant_name IS NOT NULL AND v_variant_name != '' THEN
      v_found_variant := FALSE;
      FOR v_variant IN SELECT jsonb_array_elements(v_product.variants) LOOP
        IF v_variant->>'name' = v_variant_name THEN
          v_unit_price := (v_variant->>'price')::BIGINT;
          v_found_variant := TRUE;
          EXIT;
        END IF;
      END LOOP;
      IF NOT v_found_variant THEN
        RETURN json_build_object('success', false, 'error', 'variant_not_found', 'product_id', v_product_id, 'variant_name', v_variant_name);
      END IF;
    END IF;

    -- Appliquer les prix dégressifs (wholesale tiers) si applicables
    IF v_product.wholesale_tiers IS NOT NULL AND jsonb_array_length(v_product.wholesale_tiers) > 0 THEN
      SELECT elem INTO v_tier
      FROM jsonb_array_elements(v_product.wholesale_tiers) AS elem
      WHERE v_quantity >= (elem->>'min_qty')::INTEGER
      ORDER BY (elem->>'min_qty')::INTEGER DESC
      LIMIT 1;

      IF v_tier IS NOT NULL THEN
        v_unit_price := (v_tier->>'price')::BIGINT;
      END IF;
    END IF;

    v_grand_total := v_grand_total + (v_unit_price * v_quantity);
  END LOOP;

  -- 2. VÉRIFIER LE SOLDE DU WALLET DE L'ACHETEUR (AVEC LOCK)
  SELECT * INTO v_buyer_wallet FROM wallets WHERE user_id = p_buyer_id FOR UPDATE;
  IF v_buyer_wallet.balance_available < v_grand_total THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'insufficient_balance', 
      'required', v_grand_total, 
      'available', v_buyer_wallet.balance_available
    );
  END IF;

  -- 3. BLOQUER LES FONDS GLOBALEMENT (ESCROW)
  UPDATE wallets SET
    balance_available = balance_available - v_grand_total,
    balance_reserved = balance_reserved + v_grand_total
  WHERE user_id = p_buyer_id;

  -- 4. TRAITER CHAQUE ARTICLE DU PANIER (DÉDUCTION STOCK + COMMANDE)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_quantity := (v_item->>'qty')::INTEGER;
    v_variant_name := v_item->>'variant_name';

    -- Récupérer le produit et verrouiller la ligne pour éviter les race conditions de stock
    SELECT * INTO v_product FROM products WHERE id = v_product_id FOR UPDATE;

    -- Déterminer le prix unitaire
    v_unit_price := v_product.price;
    v_found_tier := FALSE;
    
    IF v_variant_name IS NOT NULL AND v_variant_name != '' THEN
      FOR v_variant IN SELECT jsonb_array_elements(v_product.variants) LOOP
        IF v_variant->>'name' = v_variant_name THEN
          v_unit_price := (v_variant->>'price')::BIGINT;
          
          -- Vérifier le stock de la variante si défini
          IF v_variant->'stock' IS NOT NULL AND (v_variant->>'stock') != 'null' THEN
            v_stock_quantity := (v_variant->>'stock')::INTEGER;
            IF v_stock_quantity < v_quantity THEN
              RAISE EXCEPTION 'insufficient_variant_stock';
            END IF;
            
            -- Déduire le stock de la variante
            UPDATE products
            SET variants = (
              SELECT jsonb_agg(
                CASE
                  WHEN elem->>'name' = v_variant_name THEN jsonb_set(elem, '{stock}', to_jsonb(v_stock_quantity - v_quantity))
                  ELSE elem
                END
              )
              FROM jsonb_array_elements(variants) AS elem
            )
            WHERE id = v_product_id;
          END IF;
          EXIT;
        END IF;
      END LOOP;
    ELSE
      -- Vérifier le stock général si aucune variante
      IF v_product.stock_quantity IS NOT NULL THEN
        IF v_product.stock_quantity < v_quantity THEN
          RAISE EXCEPTION 'insufficient_stock';
        END IF;
        -- Déduire le stock général
        UPDATE products SET stock_quantity = stock_quantity - v_quantity WHERE id = v_product_id;
      END IF;
    END IF;

    -- Appliquer les prix dégressifs (wholesale tiers)
    IF v_product.wholesale_tiers IS NOT NULL AND jsonb_array_length(v_product.wholesale_tiers) > 0 THEN
      SELECT elem INTO v_tier
      FROM jsonb_array_elements(v_product.wholesale_tiers) AS elem
      WHERE v_quantity >= (elem->>'min_qty')::INTEGER
      ORDER BY (elem->>'min_qty')::INTEGER DESC
      LIMIT 1;

      IF v_tier IS NOT NULL THEN
        v_unit_price := (v_tier->>'price')::BIGINT;
        v_found_tier := TRUE;
      END IF;
    END IF;

    -- Récupérer la boutique
    SELECT * INTO v_shop FROM shops WHERE id = v_product.shop_id;
    IF v_shop.owner_id = p_buyer_id THEN
      RAISE EXCEPTION 'cannot_buy_own_product';
    END IF;

    -- Calculer les montants
    v_total := v_unit_price * v_quantity;
    v_commission := v_total * 5 / 100; -- 5% commission plateforme
    v_net := v_total - v_commission;

    -- Insérer la commande individuelle
    INSERT INTO orders (
      buyer_id, seller_id, product_id, shop_id,
      quantity, unit_price, total_amount, commission, net_amount,
      delivery_address, delivery_phone, escrow_amount,
      variant_name, applied_wholesale_discount, status
    ) VALUES (
      p_buyer_id, v_shop.owner_id, v_product_id, v_shop.id,
      v_quantity, v_unit_price, v_total, v_commission, v_net,
      p_delivery_address, p_delivery_phone, v_total,
      v_variant_name, v_found_tier, 'pending'
    ) RETURNING id INTO v_order_id;

    -- Notifier le vendeur
    PERFORM create_notification(
      v_shop.owner_id,
      'order_new',
      '📦 Nouvelle commande !',
      'Vous avez reçu une commande de ' || v_quantity || 'x ' || v_product.name || ' pour ' || v_total || ' FCFA.',
      v_order_id,
      'order'
    );

    v_created_orders := jsonb_insert(v_created_orders, '{0}', to_jsonb(v_order_id));
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'order_ids', v_created_orders,
    'total_amount', v_grand_total
  );

EXCEPTION
  WHEN OTHERS THEN
    -- En cas d'erreur (exception levée), PostgreSQL annule automatiquement toute la transaction
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
