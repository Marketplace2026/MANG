-- ============================================================
-- MANG — Row Level Security (RLS)
-- À exécuter après 01_schema.sql dans Supabase
-- ============================================================

-- Activer RLS sur toutes les tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE pieces ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE premium_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PROFILES
-- ============================================================
CREATE POLICY "Profils visibles par tous les utilisateurs connectés"
  ON profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Utilisateur peut modifier son propre profil"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);

-- ============================================================
-- WALLETS
-- ============================================================
CREATE POLICY "Wallet visible uniquement par son propriétaire"
  ON wallets FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Wallet modifiable uniquement par son propriétaire"
  ON wallets FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- PIÈCES
-- ============================================================
CREATE POLICY "Pièces visibles uniquement par leur propriétaire"
  ON pieces FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- CATÉGORIES (lecture publique)
-- ============================================================
CREATE POLICY "Catégories lisibles par tous"
  ON categories FOR SELECT USING (true);

-- ============================================================
-- BOUTIQUES
-- ============================================================
CREATE POLICY "Boutiques actives visibles par tous"
  ON shops FOR SELECT USING (is_active = true);

CREATE POLICY "Vendeur peut créer sa boutique"
  ON shops FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Vendeur peut modifier sa boutique"
  ON shops FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Vendeur peut supprimer sa boutique"
  ON shops FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

-- ============================================================
-- PRODUITS
-- ============================================================
CREATE POLICY "Produits visibles par tous"
  ON products FOR SELECT USING (true);

CREATE POLICY "Vendeur peut ajouter un produit à sa boutique"
  ON products FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM shops WHERE id = shop_id AND owner_id = auth.uid())
  );

CREATE POLICY "Vendeur peut modifier ses produits"
  ON products FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM shops WHERE id = shop_id AND owner_id = auth.uid())
  );

CREATE POLICY "Vendeur peut supprimer ses produits"
  ON products FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM shops WHERE id = shop_id AND owner_id = auth.uid())
  );

-- ============================================================
-- FOLLOWERS
-- ============================================================
CREATE POLICY "Followers visibles par tous les connectés"
  ON shop_followers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Utilisateur peut suivre une boutique"
  ON shop_followers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Utilisateur peut se désabonner"
  ON shop_followers FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- LIKES BOUTIQUES
-- ============================================================
CREATE POLICY "Likes visibles par tous les connectés"
  ON shop_likes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Utilisateur peut liker"
  ON shop_likes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Utilisateur peut retirer son like"
  ON shop_likes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- COMMENTAIRES BOUTIQUES
-- ============================================================
CREATE POLICY "Commentaires visibles par tous les connectés"
  ON shop_comments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Utilisateur peut commenter"
  ON shop_comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Utilisateur peut modifier son commentaire"
  ON shop_comments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Utilisateur peut supprimer son commentaire"
  ON shop_comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Likes commentaires visibles"
  ON shop_comment_likes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Utilisateur peut liker un commentaire"
  ON shop_comment_likes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Utilisateur peut retirer son like commentaire"
  ON shop_comment_likes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- PRODUITS FAVORIS
-- ============================================================
CREATE POLICY "Favoris visibles par leur propriétaire"
  ON product_favorites FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Utilisateur peut ajouter un favori"
  ON product_favorites FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Utilisateur peut retirer un favori"
  ON product_favorites FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- COMMANDES
-- ============================================================
CREATE POLICY "Acheteur voit ses commandes"
  ON orders FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Acheteur peut passer commande"
  ON orders FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Vendeur peut mettre à jour le statut"
  ON orders FOR UPDATE TO authenticated
  USING (auth.uid() = seller_id OR auth.uid() = buyer_id);

-- ============================================================
-- TRANSACTIONS WALLET
-- ============================================================
CREATE POLICY "Transactions visibles par leur propriétaire"
  ON wallet_transactions FOR SELECT TO authenticated
  USING (
    wallet_id IN (SELECT id FROM wallets WHERE user_id = auth.uid())
  );

-- ============================================================
-- ABONNEMENTS PREMIUM
-- ============================================================
CREATE POLICY "Abonnements visibles par le propriétaire de la boutique"
  ON premium_subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- CONVERSATIONS
-- ============================================================
CREATE POLICY "Conversation visible par ses participants"
  ON conversations FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Acheteur ou vendeur peut créer une conversation"
  ON conversations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Participants peuvent modifier la conversation"
  ON conversations FOR UPDATE TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- ============================================================
-- MESSAGES
-- ============================================================
CREATE POLICY "Messages visibles par les participants de la conversation"
  ON messages FOR SELECT TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE buyer_id = auth.uid() OR seller_id = auth.uid()
    )
  );

CREATE POLICY "Participant peut envoyer un message"
  ON messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    conversation_id IN (
      SELECT id FROM conversations
      WHERE buyer_id = auth.uid() OR seller_id = auth.uid()
    )
  );

CREATE POLICY "Expéditeur peut modifier son message"
  ON messages FOR UPDATE TO authenticated
  USING (auth.uid() = sender_id);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE POLICY "Notifications visibles par leur destinataire"
  ON notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Notification modifiable par son destinataire"
  ON notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Notification supprimable par son destinataire"
  ON notifications FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- POSTS COMMUNAUTÉ
-- ============================================================
CREATE POLICY "Posts visibles par tous les connectés"
  ON posts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Utilisateur peut publier"
  ON posts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Utilisateur peut modifier son post"
  ON posts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Utilisateur peut supprimer son post"
  ON posts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Likes posts visibles"
  ON post_likes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Utilisateur peut liker un post"
  ON post_likes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Utilisateur peut retirer son like post"
  ON post_likes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Commentaires posts visibles"
  ON post_comments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Utilisateur peut commenter un post"
  ON post_comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Utilisateur peut modifier son commentaire post"
  ON post_comments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Utilisateur peut supprimer son commentaire post"
  ON post_comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Likes commentaires posts visibles"
  ON post_comment_likes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Utilisateur peut liker un commentaire post"
  ON post_comment_likes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Utilisateur peut retirer son like commentaire post"
  ON post_comment_likes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- USER FOLLOWS
-- ============================================================
CREATE POLICY "Follows visibles par tous les connectés"
  ON user_follows FOR SELECT TO authenticated USING (true);

CREATE POLICY "Utilisateur peut suivre quelqu'un"
  ON user_follows FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Utilisateur peut se désabonner"
  ON user_follows FOR DELETE TO authenticated
  USING (auth.uid() = follower_id);

-- ============================================================
-- HISTORIQUE RECHERCHE
-- ============================================================
CREATE POLICY "Historique visible par son propriétaire"
  ON search_history FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Utilisateur peut ajouter une recherche"
  ON search_history FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Utilisateur peut supprimer son historique"
  ON search_history FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- DONNÉES INITIALES — CATÉGORIES
-- ============================================================
INSERT INTO categories (name, slug, group_name, icon, sort_order) VALUES
-- Groupe 1 : Céréales & Légumineuses
('Maïs', 'mais', 'Céréales & Légumineuses', '🌽', 1),
('Riz', 'riz', 'Céréales & Légumineuses', '🌾', 2),
('Sorgho', 'sorgho', 'Céréales & Légumineuses', '🌾', 3),
('Mil', 'mil', 'Céréales & Légumineuses', '🌾', 4),
('Niébé', 'niebe', 'Céréales & Légumineuses', '🫘', 5),
('Soja', 'soja', 'Céréales & Légumineuses', '🫘', 6),
('Arachide', 'arachide', 'Céréales & Légumineuses', '🥜', 7),
-- Groupe 2 : Tubercules & Racines
('Manioc', 'manioc', 'Tubercules & Racines', '🥔', 8),
('Igname', 'igname', 'Tubercules & Racines', '🍠', 9),
('Patate douce', 'patate-douce', 'Tubercules & Racines', '🍠', 10),
('Taro', 'taro', 'Tubercules & Racines', '🥔', 11),
-- Groupe 3 : Fruits & Légumes
('Tomate', 'tomate', 'Fruits & Légumes', '🍅', 12),
('Oignon', 'oignon', 'Fruits & Légumes', '🧅', 13),
('Piment', 'piment', 'Fruits & Légumes', '🌶️', 14),
('Gombo', 'gombo', 'Fruits & Légumes', '🥦', 15),
('Aubergine', 'aubergine', 'Fruits & Légumes', '🍆', 16),
('Banane plantain', 'banane-plantain', 'Fruits & Légumes', '🍌', 17),
('Mangue', 'mangue', 'Fruits & Légumes', '🥭', 18),
('Ananas', 'ananas', 'Fruits & Légumes', '🍍', 19),
('Papaye', 'papaye', 'Fruits & Légumes', '🍈', 20),
-- Groupe 4 : Produits Animaux
('Volaille', 'volaille', 'Produits Animaux', '🐔', 21),
('Bœuf', 'boeuf', 'Produits Animaux', '🐄', 22),
('Porc', 'porc', 'Produits Animaux', '🐷', 23),
('Poisson', 'poisson', 'Produits Animaux', '🐟', 24),
('Œufs', 'oeufs', 'Produits Animaux', '🥚', 25),
('Lait & produits laitiers', 'lait', 'Produits Animaux', '🥛', 26),
-- Groupe 5 : Produits Transformés
('Huile de palme', 'huile-palme', 'Produits Transformés', '🫙', 27),
('Farine de manioc (Gari)', 'gari', 'Produits Transformés', '🫙', 28),
('Farine de maïs', 'farine-mais', 'Produits Transformés', '🫙', 29),
('Akassa', 'akassa', 'Produits Transformés', '🍚', 30),
('Soumbala', 'soumbala', 'Produits Transformés', '🫙', 31),
-- Groupe 6 : Épices & Condiments
('Poivre', 'poivre', 'Épices & Condiments', '🌿', 32),
('Gingembre', 'gingembre', 'Épices & Condiments', '🫚', 33),
('Ail', 'ail', 'Épices & Condiments', '🧄', 34),
('Moringa', 'moringa', 'Épices & Condiments', '🌿', 35),
-- Groupe 7 : Intrants Agricoles
('Semences', 'semences', 'Intrants Agricoles', '🌱', 36),
('Engrais', 'engrais', 'Intrants Agricoles', '🧪', 37),
('Pesticides', 'pesticides', 'Intrants Agricoles', '🧴', 38),
('Matériel agricole', 'materiel-agricole', 'Intrants Agricoles', '🚜', 39);
