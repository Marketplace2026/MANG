-- ============================================================
-- MANG — Marché Agricole Nouvelle Génération
-- Schéma complet de la base de données — Supabase/PostgreSQL
-- ============================================================

-- Extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Pour la recherche floue

-- ============================================================
-- 1. PROFILS UTILISATEURS
-- ============================================================
CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username        TEXT UNIQUE NOT NULL,
  full_name       TEXT,
  email           TEXT,
  phone           TEXT,
  avatar_url      TEXT,
  city            TEXT,
  latitude        DOUBLE PRECISION,
  longitude       DOUBLE PRECISION,
  last_seen_at    TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. WALLET (MANG WALLET)
-- ============================================================
CREATE TABLE wallets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  wallet_number   CHAR(10) UNIQUE NOT NULL, -- Numéro à 10 chiffres
  balance_total   BIGINT DEFAULT 0 NOT NULL, -- En centimes FCFA
  balance_available BIGINT DEFAULT 0 NOT NULL,
  balance_reserved  BIGINT DEFAULT 0 NOT NULL,
  pin_hash        TEXT, -- Hash du code PIN 4 chiffres
  pin_set         BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT balance_positive CHECK (balance_available >= 0),
  CONSTRAINT balance_reserved_positive CHECK (balance_reserved >= 0)
);

-- ============================================================
-- 3. PIÈCES (MONNAIE INTERNE)
-- ============================================================
CREATE TABLE pieces (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  balance         INTEGER DEFAULT 0 NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT pieces_positive CHECK (balance >= 0)
);

-- ============================================================
-- 4. CATÉGORIES
-- ============================================================
CREATE TABLE categories (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  group_name      TEXT NOT NULL, -- 1 des 7 groupes
  icon            TEXT,
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. BOUTIQUES
-- ============================================================
CREATE TABLE shops (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  description     TEXT,
  category_id     UUID REFERENCES categories(id),
  cover_url       TEXT,
  city            TEXT,
  latitude        DOUBLE PRECISION,
  longitude       DOUBLE PRECISION,
  has_delivery    BOOLEAN DEFAULT FALSE,
  whatsapp        TEXT,
  -- Premium
  premium_level   INTEGER DEFAULT 0 CHECK (premium_level IN (0,1,2,3)),
  premium_expires_at TIMESTAMPTZ,
  -- Stats
  followers_count INTEGER DEFAULT 0,
  likes_count     INTEGER DEFAULT 0,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour la recherche floue
CREATE INDEX idx_shops_name_trgm ON shops USING gin(name gin_trgm_ops);
CREATE INDEX idx_shops_description_trgm ON shops USING gin(description gin_trgm_ops);
CREATE INDEX idx_shops_owner ON shops(owner_id);
CREATE INDEX idx_shops_premium ON shops(premium_level DESC, created_at DESC);

-- ============================================================
-- 6. PRODUITS
-- ============================================================
CREATE TABLE products (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id         UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  price           BIGINT NOT NULL, -- En FCFA
  image_url       TEXT,
  availability    TEXT DEFAULT 'now' CHECK (
    availability IN ('now','1w','2w','1m','2m','3m','6m','1y')
  ),
  is_available    BOOLEAN DEFAULT TRUE,
  favorites_count INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_shop ON products(shop_id);

-- ============================================================
-- 7. FOLLOWERS (BOUTIQUES SUIVIES)
-- ============================================================
CREATE TABLE shop_followers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id         UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shop_id, user_id)
);

-- ============================================================
-- 8. LIKES BOUTIQUES
-- ============================================================
CREATE TABLE shop_likes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id         UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shop_id, user_id)
);

-- ============================================================
-- 9. COMMENTAIRES BOUTIQUES
-- ============================================================
CREATE TABLE shop_comments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id         UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_id       UUID REFERENCES shop_comments(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  likes_count     INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE shop_comment_likes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id      UUID NOT NULL REFERENCES shop_comments(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

-- ============================================================
-- 10. PRODUITS FAVORIS
-- ============================================================
CREATE TABLE product_favorites (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, user_id)
);

-- ============================================================
-- 11. COMMANDES
-- ============================================================
CREATE TABLE orders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id        UUID NOT NULL REFERENCES profiles(id),
  seller_id       UUID NOT NULL REFERENCES profiles(id),
  product_id      UUID NOT NULL REFERENCES products(id),
  shop_id         UUID NOT NULL REFERENCES shops(id),
  quantity        INTEGER NOT NULL DEFAULT 1,
  unit_price      BIGINT NOT NULL,
  total_amount    BIGINT NOT NULL,
  commission      BIGINT NOT NULL DEFAULT 0, -- 5% plateforme
  net_amount      BIGINT NOT NULL, -- total - commission
  delivery_address TEXT,
  delivery_phone  TEXT,
  note            TEXT,
  status          TEXT DEFAULT 'pending' CHECK (
    status IN ('pending','accepted','refused','paid')
  ),
  escrow_amount   BIGINT DEFAULT 0, -- Montant en réserve
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_buyer ON orders(buyer_id);
CREATE INDEX idx_orders_seller ON orders(seller_id);
CREATE INDEX idx_orders_status ON orders(status);

-- ============================================================
-- 12. TRANSACTIONS WALLET
-- ============================================================
CREATE TABLE wallet_transactions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id       UUID NOT NULL REFERENCES wallets(id),
  type            TEXT NOT NULL CHECK (
    type IN ('recharge','transfer_in','transfer_out','order_payment',
             'order_refund','order_received','subscription','pieces_purchase')
  ),
  amount          BIGINT NOT NULL, -- Positif = crédit, négatif = débit
  balance_after   BIGINT NOT NULL,
  description     TEXT,
  reference_id    UUID, -- ID de la commande/transfert lié
  receipt_number  TEXT UNIQUE, -- Format MANG-2024-XXXXXX
  receipt_hash    TEXT,
  fedapay_id      TEXT, -- ID transaction FedaPay
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_wallet ON wallet_transactions(wallet_id);
CREATE INDEX idx_transactions_type ON wallet_transactions(type);

-- ============================================================
-- 13. ABONNEMENTS PREMIUM
-- ============================================================
CREATE TABLE premium_subscriptions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id         UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id),
  level           INTEGER NOT NULL CHECK (level IN (1,2,3)),
  amount          BIGINT NOT NULL,
  starts_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL,
  transaction_id  UUID REFERENCES wallet_transactions(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 14. MESSAGERIE
-- ============================================================
CREATE TABLE conversations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id         UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  buyer_id        UUID NOT NULL REFERENCES profiles(id),
  seller_id       UUID NOT NULL REFERENCES profiles(id),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  buyer_deleted   BOOLEAN DEFAULT FALSE,
  seller_deleted  BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shop_id, buyer_id)
);

CREATE INDEX idx_conversations_buyer ON conversations(buyer_id);
CREATE INDEX idx_conversations_seller ON conversations(seller_id);
CREATE INDEX idx_conversations_shop ON conversations(shop_id);

CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES profiles(id),
  content         TEXT,
  type            TEXT DEFAULT 'text' CHECK (
    type IN ('text','image','video','audio','file')
  ),
  file_url        TEXT,
  file_name       TEXT,
  file_size       BIGINT,
  reactions       JSONB DEFAULT '{}',
  is_read         BOOLEAN DEFAULT FALSE,
  deleted_by_sender    BOOLEAN DEFAULT FALSE,
  deleted_by_receiver  BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);

-- ============================================================
-- 15. NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (
    type IN (
      'shop_follow','product_favorite','shop_comment','comment_reply',
      'post_like','shop_like','comment_like','user_follow','new_message',
      'order_new','order_accepted','order_refused','order_paid',
      'wallet_credit','wallet_debit'
    )
  ),
  title           TEXT NOT NULL,
  body            TEXT,
  reference_id    UUID, -- ID de l'entité concernée
  reference_type  TEXT, -- 'shop','product','order','message','post'
  is_read         BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- ============================================================
-- 16. COMMUNAUTÉ — PUBLICATIONS
-- ============================================================
CREATE TABLE posts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  likes_count     INTEGER DEFAULT 0,
  comments_count  INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_posts_user ON posts(user_id);
CREATE INDEX idx_posts_created ON posts(created_at DESC);

CREATE TABLE post_likes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id         UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

CREATE TABLE post_comments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id         UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_id       UUID REFERENCES post_comments(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  likes_count     INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE post_comment_likes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id      UUID NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

-- ============================================================
-- 17. ABONNEMENTS UTILISATEURS (SOCIAL)
-- ============================================================
CREATE TABLE user_follows (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- ============================================================
-- 18. HISTORIQUE DE RECHERCHE
-- ============================================================
CREATE TABLE search_history (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  query           TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FONCTIONS & TRIGGERS
-- ============================================================

-- Génère un numéro de wallet unique à 10 chiffres
CREATE OR REPLACE FUNCTION generate_wallet_number()
RETURNS CHAR(10) AS $$
DECLARE
  num CHAR(10);
BEGIN
  LOOP
    num := LPAD(FLOOR(RANDOM() * 9999999999 + 1)::BIGINT::TEXT, 10, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM wallets WHERE wallet_number = num);
  END LOOP;
  RETURN num;
END;
$$ LANGUAGE plpgsql;

-- Crée automatiquement profil + wallet + pièces à l'inscription
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  w_number CHAR(10);
BEGIN
  w_number := generate_wallet_number();

  INSERT INTO profiles (id, username, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substring(NEW.id::text, 1, 8)),
    NEW.email
  );

  INSERT INTO wallets (user_id, wallet_number)
  VALUES (NEW.id, w_number);

  INSERT INTO pieces (user_id, balance)
  VALUES (NEW.id, 0);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Met à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_shops_updated BEFORE UPDATE ON shops FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_wallets_updated BEFORE UPDATE ON wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Met à jour followers_count sur shops
CREATE OR REPLACE FUNCTION update_shop_followers_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE shops SET followers_count = followers_count + 1 WHERE id = NEW.shop_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE shops SET followers_count = GREATEST(0, followers_count - 1) WHERE id = OLD.shop_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_shop_followers_count
  AFTER INSERT OR DELETE ON shop_followers
  FOR EACH ROW EXECUTE FUNCTION update_shop_followers_count();

-- Met à jour likes_count sur shops
CREATE OR REPLACE FUNCTION update_shop_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE shops SET likes_count = likes_count + 1 WHERE id = NEW.shop_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE shops SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.shop_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_shop_likes_count
  AFTER INSERT OR DELETE ON shop_likes
  FOR EACH ROW EXECUTE FUNCTION update_shop_likes_count();

-- Met à jour favorites_count sur products
CREATE OR REPLACE FUNCTION update_product_favorites_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE products SET favorites_count = favorites_count + 1 WHERE id = NEW.product_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE products SET favorites_count = GREATEST(0, favorites_count - 1) WHERE id = OLD.product_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_product_favorites_count
  AFTER INSERT OR DELETE ON product_favorites
  FOR EACH ROW EXECUTE FUNCTION update_product_favorites_count();

-- Met à jour likes/comments count sur posts
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_post_likes_count
  AFTER INSERT OR DELETE ON post_likes
  FOR EACH ROW EXECUTE FUNCTION update_post_likes_count();

CREATE OR REPLACE FUNCTION update_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_post_comments_count
  AFTER INSERT OR DELETE ON post_comments
  FOR EACH ROW EXECUTE FUNCTION update_post_comments_count();

-- Met à jour last_message_at sur conversations
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_conversation_last_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

-- Génère un numéro de reçu unique
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TEXT AS $$
DECLARE
  num TEXT;
BEGIN
  LOOP
    num := 'MANG-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' || LPAD(FLOOR(RANDOM() * 999999 + 1)::TEXT, 6, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM wallet_transactions WHERE receipt_number = num);
  END LOOP;
  RETURN num;
END;
$$ LANGUAGE plpgsql;
