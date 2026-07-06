-- ============================================================
-- MANG — PHASE 1 CONSOLIDATED FIXES
-- À exécuter dans Supabase pour corriger les schémas et ajouter les RPC
-- ============================================================

-- 1. Ajout des colonnes manquantes dans profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- 2. Ajout des colonnes manquantes dans shops
ALTER TABLE shops ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS rating_avg DOUBLE PRECISION DEFAULT 0.0;

-- 3. Ajout de la colonne manquante dans conversations
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message TEXT;

-- 4. Ajout de la colonne manquante dans orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'pending' 
  CHECK (delivery_status IN ('pending', 'preparing', 'shipped', 'delivered'));

-- 5. Mise à jour de la contrainte CHECK sur notifications.type
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (
  type IN (
    'shop_follow','product_favorite','shop_comment','comment_reply',
    'post_like','shop_like','comment_like','user_follow','new_message',
    'order_new','order_accepted','order_refused','order_paid',
    'wallet_credit','wallet_debit', 'verification_request'
  )
);

-- 6. Création de la table referrals
CREATE TABLE IF NOT EXISTS referrals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referred_id     UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'shop_created', 'rewarded')),
  pieces_given    INTEGER DEFAULT 0 NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- RLS pour referrals
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Referrals visibles par le parrain" ON referrals;
CREATE POLICY "Referrals visibles par le parrain"
  ON referrals FOR SELECT TO authenticated
  USING (auth.uid() = referrer_id);

-- 7. Création de la table verification_requests
CREATE TABLE IF NOT EXISTS verification_requests (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shop_id             UUID UNIQUE NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  shop_name           TEXT,
  full_name           TEXT NOT NULL,
  phone               TEXT NOT NULL,
  id_type             TEXT NOT NULL,
  id_photo_url        TEXT,
  selfie_url          TEXT,
  profile_type        TEXT NOT NULL CHECK (profile_type IN ('producteur', 'commercant', 'service')),
  activity_type       TEXT NOT NULL,
  years_experience    INTEGER,
  location            TEXT NOT NULL,
  production_method   TEXT,
  use_pesticides      BOOLEAN,
  monthly_capacity    TEXT,
  farm_size           TEXT,
  products_type       TEXT,
  supply_source       TEXT,
  delivery_scope      TEXT NOT NULL,
  certifications      TEXT,
  additional_info     TEXT,
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note          TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- RLS pour verification_requests
ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin peut tout faire sur les demandes" ON verification_requests;
CREATE POLICY "Admin peut tout faire sur les demandes"
  ON verification_requests TO authenticated
  USING (auth.uid() = 'd9f97369-ae78-4da2-844c-1c9c97b12445'::uuid);

DROP POLICY IF EXISTS "Vendeur peut voir ses propres demandes" ON verification_requests;
CREATE POLICY "Vendeur peut voir ses propres demandes"
  ON verification_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Vendeur peut creer une demande" ON verification_requests;
CREATE POLICY "Vendeur peut creer une demande"
  ON verification_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 8. Fonctions utilitaires de génération de code de parrainage
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
BEGIN
  LOOP
    code := UPPER(substring(md5(random()::text), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE referral_code = code);
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- 9. Mise à jour de la fonction handle_new_user pour insérer un code de parrainage
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  w_number CHAR(10);
BEGIN
  w_number := generate_wallet_number();

  INSERT INTO profiles (id, username, email, referral_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substring(NEW.id::text, 1, 8)),
    NEW.email,
    generate_referral_code()
  );

  INSERT INTO wallets (user_id, wallet_number)
  VALUES (NEW.id, w_number);

  INSERT INTO pieces (user_id, balance)
  VALUES (NEW.id, 0);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Fonction RPC create_notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, body, reference_id, reference_type)
  VALUES (p_user_id, p_type, p_title, p_body, p_reference_id, p_reference_type);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Fonction RPC process_referral
CREATE OR REPLACE FUNCTION process_referral(
  p_referred_id UUID,
  p_referral_code TEXT
)
RETURNS JSON AS $$
DECLARE
  v_referrer_id UUID;
  v_referrer_username TEXT;
  v_already_referred BOOLEAN;
BEGIN
  -- Trouver le parrain
  SELECT id, username INTO v_referrer_id, v_referrer_username
  FROM profiles
  WHERE referral_code = UPPER(TRIM(p_referral_code));

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'referrer_not_found');
  END IF;

  -- Eviter l'auto-parrainage
  IF v_referrer_id = p_referred_id THEN
    RETURN json_build_object('success', false, 'error', 'cannot_refer_self');
  END IF;

  -- Verifier si deja parraine
  SELECT EXISTS (
    SELECT 1 FROM referrals WHERE referred_id = p_referred_id
  ) INTO v_already_referred;

  IF v_already_referred THEN
    RETURN json_build_object('success', false, 'error', 'already_referred');
  END IF;

  -- Creer la relation de parrainage (Parrain reçoit 20 pièces)
  INSERT INTO referrals (referrer_id, referred_id, status, pieces_given)
  VALUES (v_referrer_id, p_referred_id, 'registered', 20);

  -- Crediter le filleul (+10 pieces)
  UPDATE pieces SET balance = balance + 10 WHERE user_id = p_referred_id;

  -- Crediter le parrain (+20 pieces)
  UPDATE pieces SET balance = balance + 20 WHERE user_id = v_referrer_id;

  -- Notifier le parrain
  PERFORM create_notification(
    v_referrer_id,
    'user_follow',
    '🎁 Nouveau filleul !',
    'Un utilisateur s''est inscrit avec votre code. Vous avez reçu 20 pièces.',
    p_referred_id,
    'profile'
  );

  RETURN json_build_object('success', true, 'referrer_username', v_referrer_username);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Trigger pour récompenser le parrain à la création de boutique du filleul
CREATE OR REPLACE FUNCTION handle_referred_shop_creation()
RETURNS TRIGGER AS $$
DECLARE
  v_referral referrals%ROWTYPE;
  v_referred_username TEXT;
BEGIN
  SELECT * INTO v_referral
  FROM referrals
  WHERE referred_id = NEW.owner_id AND status = 'registered';

  IF FOUND THEN
    UPDATE referrals
    SET status = 'rewarded',
        pieces_given = pieces_given + 50,
        updated_at = NOW()
    WHERE id = v_referral.id;

    UPDATE pieces
    SET balance = balance + 50
    WHERE user_id = v_referral.referrer_id;

    SELECT username INTO v_referred_username FROM profiles WHERE id = NEW.owner_id;

    PERFORM create_notification(
      v_referral.referrer_id,
      'shop_like',
      '🏪 Boutique filleul créée !',
      'Votre filleul @' || COALESCE(v_referred_username, 'filleul') || ' a créé sa boutique. Vous recevez 50 pièces !',
      NEW.id,
      'shop'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_referred_shop_created ON shops;
CREATE TRIGGER trg_referred_shop_created
  AFTER INSERT ON shops
  FOR EACH ROW
  EXECUTE FUNCTION handle_referred_shop_creation();

-- 13. Fonction RPC transfer_money (qui adapte et appelle transfer_funds)
CREATE OR REPLACE FUNCTION transfer_money(
  sender_uuid UUID,
  receiver_wallet_number CHAR(10),
  amount_fcfa BIGINT,
  user_pin TEXT
)
RETURNS JSON AS $$
BEGIN
  -- transfer_funds attend l'id, le numero de wallet, le montant et le pin
  RETURN transfer_funds(sender_uuid, receiver_wallet_number, amount_fcfa, user_pin);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Fonction RPC mark_conversation_read
CREATE OR REPLACE FUNCTION mark_conversation_read(
  p_conversation_id UUID,
  p_user_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE messages
  SET is_read = TRUE
  WHERE conversation_id = p_conversation_id
    AND sender_id != p_user_id
    AND (is_read = FALSE OR is_read IS NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. Fonction RPC accept_order
CREATE OR REPLACE FUNCTION accept_order(
  p_order_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_order orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id AND seller_id = auth.uid() AND status = 'pending';
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'order_not_found_or_not_pending');
  END IF;

  UPDATE orders SET status = 'accepted', updated_at = NOW() WHERE id = p_order_id;

  PERFORM create_notification(
    v_order.buyer_id,
    'order_accepted',
    '📦 Commande acceptée !',
    'Le vendeur a accepté votre commande. Vous pouvez maintenant procéder au paiement.',
    p_order_id,
    'order'
  );

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 16. Fonction RPC update_delivery_status
CREATE OR REPLACE FUNCTION update_delivery_status(
  p_seller_id UUID,
  p_order_id UUID,
  p_status TEXT
)
RETURNS JSON AS $$
DECLARE
  v_order orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id AND seller_id = p_seller_id AND status = 'paid';
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'order_not_found_or_not_paid');
  END IF;

  UPDATE orders SET delivery_status = p_status, updated_at = NOW() WHERE id = p_order_id;

  PERFORM create_notification(
    v_order.buyer_id,
    'order_paid',
    CASE p_status
      WHEN 'preparing' THEN '📦 Commande en préparation'
      WHEN 'shipped' THEN '🚚 Commande expédiée !'
      WHEN 'delivered' THEN '✅ Commande livrée !'
      ELSE '📦 Mise à jour de la livraison'
    END,
    CASE p_status
      WHEN 'preparing' THEN 'Le vendeur prépare votre commande.'
      WHEN 'shipped' THEN 'Le vendeur a expédié votre commande. Elle est en route.'
      WHEN 'delivered' THEN 'Le vendeur a marqué la commande comme livrée.'
      ELSE 'Le statut de livraison de votre commande a été mis à jour.'
    END,
    p_order_id,
    'order'
  );

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 17. Amélioration du trigger de mise à jour automatique de conversations
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET last_message_at = NEW.created_at,
      last_message = CASE NEW.type
                       WHEN 'image' THEN '📷 Photo'
                       WHEN 'video' THEN '🎥 Vidéo'
                       WHEN 'audio' THEN '🎤 Message vocal'
                       WHEN 'file' THEN '📁 Fichier'
                       ELSE NEW.content
                     END
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
