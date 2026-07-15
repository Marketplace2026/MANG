-- ============================================================
-- TÂCHE 2 : SYSTÈME DE PARRAINAGE GAMIFIÉ & ANTI-FRAUDE (v2.0)
-- ============================================================

-- 1. Extension de la table des profils et des parrainages
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS signup_ip TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS signup_ua TEXT;

ALTER TABLE referrals ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS device_fingerprint TEXT;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS commission_paid BOOLEAN DEFAULT FALSE;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS suspicious BOOLEAN DEFAULT FALSE;

-- 2. Mise à jour de la fonction RPC process_referral pour inclure l'anti-fraude et la logique de Tiers
CREATE OR REPLACE FUNCTION process_referral(
  p_referred_id UUID,
  p_referral_code TEXT
)
RETURNS JSON AS $$
DECLARE
  v_referrer_id UUID;
  v_referrer_username TEXT;
  v_already_referred BOOLEAN;
  v_referral_count INTEGER;
  v_tier TEXT;
  v_parrain_coins INTEGER;
  v_filleul_coins INTEGER;
  
  -- Variables d'anti-fraude
  v_ip TEXT;
  v_ua TEXT;
  v_suspicious BOOLEAN := FALSE;
  v_referrer_ip TEXT;
  v_referrer_ua TEXT;
BEGIN
  -- Capturer les informations de connexion (IP et User-Agent) depuis les requêtes gateway Supabase
  BEGIN
    v_ip := COALESCE(
      current_setting('request.headers', true)::json->>'x-real-ip',
      current_setting('request.headers', true)::json->>'cf-connecting-ip',
      'unknown'
    );
    v_ua := COALESCE(
      current_setting('request.headers', true)::json->>'user-agent',
      'unknown'
    );
  EXCEPTION WHEN OTHERS THEN
    v_ip := 'unknown';
    v_ua := 'unknown';
  END;

  -- Mettre à jour l'IP/UA du filleul dans son profil pour référence future
  UPDATE profiles 
  SET signup_ip = v_ip, 
      signup_ua = v_ua 
  WHERE id = p_referred_id;

  -- Trouver le parrain
  SELECT id, username, signup_ip, signup_ua INTO v_referrer_id, v_referrer_username, v_referrer_ip, v_referrer_ua
  FROM profiles
  WHERE referral_code = UPPER(TRIM(p_referral_code));

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'referrer_not_found');
  END IF;

  -- Éviter l'auto-parrainage
  IF v_referrer_id = p_referred_id THEN
    RETURN json_build_object('success', false, 'error', 'cannot_refer_self');
  END IF;

  -- Vérifier si déjà parrainé
  SELECT EXISTS (
    SELECT 1 FROM referrals WHERE referred_id = p_referred_id
  ) INTO v_already_referred;

  IF v_already_referred THEN
    RETURN json_build_object('success', false, 'error', 'already_referred');
  END IF;

  -- Logique de Détection de Fraude (Anti-Multi-Comptes)
  -- Si l'IP ou le User-Agent correspond exactement à celui du parrain ou de sa dernière inscription
  IF (v_ip != 'unknown' AND (v_ip = v_referrer_ip OR EXISTS (
        SELECT 1 FROM referrals 
        WHERE referrer_id = v_referrer_id AND ip_address = v_ip
     ))) OR (v_ua != 'unknown' AND v_ua = v_referrer_ua) THEN
    v_suspicious := TRUE;
  END IF;

  -- Déterminer le palier de parrainage (Tier) du parrain
  SELECT COUNT(*) INTO v_referral_count
  FROM referrals
  WHERE referrer_id = v_referrer_id AND suspicious = FALSE;

  IF v_referral_count >= 15 THEN
    v_tier := 'Gold';
    v_parrain_coins := 50;
    v_filleul_coins := 20;
  ELSIF v_referral_count >= 5 THEN
    v_tier := 'Silver';
    v_parrain_coins := 30;
    v_filleul_coins := 15;
  ELSE
    v_tier := 'Bronze';
    v_parrain_coins := 20;
    v_filleul_coins := 10;
  END IF;

  -- Si suspecté de fraude, on gèle les gains de pièces à 0 pour le parrain et on marque le postulat
  IF v_suspicious THEN
    v_parrain_coins := 0;
  END IF;

  -- Créer la relation de parrainage
  INSERT INTO referrals (referrer_id, referred_id, status, pieces_given, ip_address, device_fingerprint, suspicious)
  VALUES (v_referrer_id, p_referred_id, 'registered', v_parrain_coins, v_ip, v_ua, v_suspicious);

  -- Créditer le filleul
  UPDATE pieces SET balance = balance + v_filleul_coins WHERE user_id = p_referred_id;

  -- Créditer le parrain (seulement s'il n'est pas suspecté de fraude)
  IF NOT v_suspicious THEN
    UPDATE pieces SET balance = balance + v_parrain_coins WHERE user_id = v_referrer_id;
    
    -- Notifier le parrain
    PERFORM create_notification(
      v_referrer_id,
      'user_follow',
      '🎁 Nouveau filleul (' || v_tier || ') !',
      'Un utilisateur s''est inscrit avec votre code. Vous recevez ' || v_parrain_coins || ' pièces MANG.',
      p_referred_id,
      'profile'
    );
  ELSE
    -- Notifier l'admin de la suspicion de fraude
    PERFORM create_notification(
      'd9f97369-ae78-4da2-844c-1c9c97b12445'::uuid, -- Admin ID
      'order_refused',
      '⚠️ Fraude parrainage suspectée',
      'Inscription suspecte détectée sur la même adresse IP ou appareil de parrainage.',
      p_referred_id,
      'profile'
    );
  END IF;

  RETURN json_build_object(
    'success', true, 
    'referrer_username', v_referrer_username, 
    'suspicious', v_suspicious,
    'tier', v_tier,
    'pieces_awarded', v_filleul_coins
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Fonction Trigger et gestion du bonus Cash au Premier Achat
CREATE OR REPLACE FUNCTION handle_referred_first_purchase()
RETURNS TRIGGER AS $$
DECLARE
  v_referral referrals%ROWTYPE;
  v_referrer_wallet_num CHAR(10);
  v_buyer_wallet_num CHAR(10);
  v_referred_username TEXT;
  v_referral_count INTEGER;
  v_commission_fcfa BIGINT;
  v_buyer_order_count INTEGER;
BEGIN
  -- S'exécute uniquement si le statut de la commande passe à 'paid' ou 'delivered'
  IF (NEW.status = 'paid' OR NEW.status = 'delivered') AND (OLD.status != 'paid' AND OLD.status != 'delivered') THEN
    
    -- Vérifier si l'acheteur a été parrainé
    SELECT * INTO v_referral
    FROM referrals
    WHERE referred_id = NEW.buyer_id AND suspicious = FALSE AND commission_paid = FALSE
    LIMIT 1;

    IF FOUND THEN
      -- Vérifier si c'est le tout premier achat payé/livré de cet acheteur
      SELECT COUNT(*) INTO v_buyer_order_count
      FROM orders
      WHERE buyer_id = NEW.buyer_id AND (status = 'paid' OR status = 'delivered') AND id != NEW.id;

      -- Si c'est effectivement sa première commande et que son prix est de 5000 FCFA minimum
      IF v_buyer_order_count = 0 AND NEW.total_price >= 5000 THEN
        
        -- Déterminer la commission du parrain selon son Tier actuel
        SELECT COUNT(*) INTO v_referral_count
        FROM referrals
        WHERE referrer_id = v_referral.referrer_id AND suspicious = FALSE;

        -- Tier Gold (15+ filleuls) = 10% du panier (plafonné à 1000 FCFA)
        -- Tier Bronze/Silver = 500 FCFA flat
        IF v_referral_count >= 15 THEN
          v_commission_fcfa := LEAST((NEW.total_price * 0.10)::BIGINT, 1000);
        ELSE
          v_commission_fcfa := 500;
        END IF;

        -- Verser la commission au parrain dans son MANG Wallet
        UPDATE wallets
        SET balance_available = balance_available + v_commission_fcfa,
            updated_at = NOW()
        WHERE user_id = v_referral.referrer_id;

        -- Verser le bonus de bienvenue au filleul (+250 FCFA)
        UPDATE wallets
        SET balance_available = balance_available + 250,
            updated_at = NOW()
        WHERE user_id = NEW.buyer_id;

        -- Marquer le parrainage comme récompensé financièrement
        UPDATE referrals
        SET commission_paid = TRUE,
            status = 'rewarded',
            updated_at = NOW()
        WHERE id = v_referral.id;

        -- Récupérer les pseudos pour les notifications
        SELECT username INTO v_referred_username FROM profiles WHERE id = NEW.buyer_id;

        -- Notification pour le parrain
        PERFORM create_notification(
          v_referral.referrer_id,
          'wallet_credit',
          '💰 Commission Parrainage reçue !',
          'Votre filleul @' || COALESCE(v_referred_username, 'filleul') || ' a fait son 1er achat. Vous gagnez ' || v_commission_fcfa || ' FCFA !',
          NEW.id,
          'order'
        );

        -- Notification pour le filleul
        PERFORM create_notification(
          NEW.buyer_id,
          'wallet_credit',
          '🎉 Bonus de bienvenue reçu !',
          'Grâce à votre parrain, vous recevez +250 FCFA crédités sur votre portefeuille.',
          NEW.id,
          'order'
        );

      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enregistrer le trigger sur la table des commandes
DROP TRIGGER IF EXISTS trg_referred_first_purchase ON orders;
CREATE TRIGGER trg_referred_first_purchase
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION handle_referred_first_purchase();
