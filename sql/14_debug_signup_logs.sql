-- ============================================================
-- SQL DEBUG : CAPTURE DU MESSAGE D'ERREUR EXACT DE L'INSCRIPTION
-- ============================================================

-- 1. Création de la table de logs temporaire
CREATE TABLE IF NOT EXISTS public.signup_errors (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  error_message TEXT,
  error_detail TEXT,
  error_hint TEXT,
  error_context TEXT
);

-- 2. Activer la lecture publique sur cette table de logs pour qu'on puisse la lire
ALTER TABLE public.signup_errors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lecture publique des erreurs" ON public.signup_errors;
CREATE POLICY "Lecture publique des erreurs" ON public.signup_errors FOR SELECT USING (true);

-- 3. Mise à jour de la fonction trigger pour intercepter l'erreur et la sauvegarder
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
EXCEPTION WHEN OTHERS THEN
  -- Intercepter l'erreur, l'insérer dans signup_errors et autoriser quand même la création du compte auth pour inspection
  INSERT INTO public.signup_errors (error_message, error_detail, error_hint, error_context)
  VALUES (SQLERRM, SQLDETAIL, SQLHINT, PG_EXCEPTION_CONTEXT);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
