-- ============================================================
-- SQL PATCH 28 : BONUS DE BIENVENUE 20 PIÈCES À L'INSCRIPTION
-- ============================================================

-- Met à jour le trigger de création de compte pour attribuer 20 pièces gratuitement à l'inscription
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  w_number CHAR(10);
BEGIN
  -- Générer le numéro de wallet
  w_number := generate_wallet_number();

  -- 1. Insérer dans public.profiles si absent
  INSERT INTO public.profiles (id, username, email, referral_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substring(NEW.id::text, 1, 8)),
    NEW.email,
    generate_referral_code()
  )
  ON CONFLICT (id) DO NOTHING;

  -- 2. Insérer dans public.wallets avec solde initial à 0
  INSERT INTO public.wallets (user_id, wallet_number, balance_total, balance_available, balance_reserved)
  VALUES (NEW.id, w_number, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- 3. Insérer dans public.pieces avec 20 PIÈCES DE BIENVENUE OFFERTES
  INSERT INTO public.pieces (user_id, balance)
  VALUES (NEW.id, 20)
  ON CONFLICT (user_id) DO UPDATE SET balance = GREATEST(pieces.balance, 20);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
