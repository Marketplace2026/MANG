-- ============================================================
-- SQL PATCH : DÉPANNAGE ET SÉCURISATION DU TRIGGER INSCRIPTION
-- ============================================================

-- 1. Nettoyage de tout doublon de trigger potentiel sur auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS trg_create_profile ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;
DROP TRIGGER IF EXISTS on_user_created ON auth.users;
DROP TRIGGER IF EXISTS create_profile_on_signup ON auth.users;

-- 2. Recréation de la fonction generate_referral_code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
BEGIN
  LOOP
    code := UPPER(substring(md5(random()::text), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = code);
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- 3. Recréation de la fonction generate_wallet_number
CREATE OR REPLACE FUNCTION generate_wallet_number()
RETURNS CHAR(10) AS $$
DECLARE
  num CHAR(10);
BEGIN
  LOOP
    num := LPAD(FLOOR(RANDOM() * 9999999999 + 1)::BIGINT::TEXT, 10, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.wallets WHERE wallet_number = num);
  END LOOP;
  RETURN num;
END;
$$ LANGUAGE plpgsql;

-- 4. Recréation de la fonction de trigger avec SECURITY DEFINER explicite
-- NOTE : Le SECURITY DEFINER est CRITIQUE ici car les tables public.wallets et public.pieces
-- ont RLS activé et n'autorisent pas l'insertion directe par les utilisateurs anonymes.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  w_number CHAR(10);
BEGIN
  -- Générer le numéro de wallet
  w_number := generate_wallet_number();

  -- 1. Insérer dans public.profiles
  INSERT INTO public.profiles (id, username, email, referral_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substring(NEW.id::text, 1, 8)),
    NEW.email,
    generate_referral_code()
  );

  -- 2. Insérer dans public.wallets
  INSERT INTO public.wallets (user_id, wallet_number)
  VALUES (NEW.id, w_number);

  -- 3. Insérer dans public.pieces
  INSERT INTO public.pieces (user_id, balance)
  VALUES (NEW.id, 0);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Création du trigger unique AFTER INSERT sur auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
