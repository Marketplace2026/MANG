-- ============================================================
-- MANG — Migration 31 : Récompense Parrainage Boutique = 20 Pièces
-- ============================================================

-- 1. Mettre à jour le trigger de création de boutique filleul (20 pièces au lieu de 50)
CREATE OR REPLACE FUNCTION handle_referred_shop_creation()
RETURNS TRIGGER AS $$
DECLARE
  v_referral referrals%ROWTYPE;
  v_referred_username TEXT;
BEGIN
  -- Chercher si le créateur de la boutique a été parrainé
  SELECT * INTO v_referral
  FROM referrals
  WHERE referred_id = NEW.owner_id AND status = 'registered';

  IF FOUND THEN
    -- Mettre à jour le parrainage avec +20 pièces
    UPDATE referrals
    SET status = 'rewarded',
        pieces_given = pieces_given + 20,
        updated_at = NOW()
    WHERE id = v_referral.id;

    -- Créditer 20 pièces au parrain
    UPDATE pieces
    SET balance = balance + 20,
        updated_at = NOW()
    WHERE user_id = v_referral.referrer_id;

    -- Récupérer le pseudo du filleul
    SELECT username INTO v_referred_username FROM profiles WHERE id = NEW.owner_id;

    -- Notifier le parrain (sans jamais bloquer la création de boutique en cas d'erreur)
    BEGIN
      PERFORM create_notification(
        v_referral.referrer_id,
        'shop_like',
        'Boutique filleul créée !',
        'Votre filleul @' || COALESCE(v_referred_username, 'filleul') || ' a créé sa boutique. Vous recevez 20 pièces !',
        NEW.id,
        'shop'
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- S'assurer que le trigger est actif sur la table shops
DROP TRIGGER IF EXISTS trg_referred_shop_created ON shops;
CREATE TRIGGER trg_referred_shop_created
  AFTER INSERT ON shops
  FOR EACH ROW
  EXECUTE FUNCTION handle_referred_shop_creation();
