const fs = require('fs');

// =============================================
// MASTER TRANSLATION ADDITIONS
// =============================================
const fr = JSON.parse(fs.readFileSync('src/locales/fr.json', 'utf8'));
const en = JSON.parse(fs.readFileSync('src/locales/en.json', 'utf8'));
const fon = JSON.parse(fs.readFileSync('src/locales/fon.json', 'utf8'));

const newKeys = {
  // COMMUN
  common_or: ['ou', 'or', 'abǐ'],
  common_loading: ['Chargement...', 'Loading...', 'É dò wá...'],
  common_save: ['Enregistrer', 'Save', 'Hwlɛ́n'],
  common_cancel: ['Annuler', 'Cancel', 'Yì sín'],
  common_confirm: ['Confirmer', 'Confirm', 'Nɔ kpɔ́n'],
  common_close: ['Fermer', 'Close', 'Gbà'],
  common_search: ['Rechercher', 'Search', 'Sɛ̀kpɔ'],
  common_filter: ['Filtrer', 'Filter', 'Lɛ̌'],
  common_share: ['Partager', 'Share', 'Bló'],
  common_see_all: ['Voir tout', 'See all', 'Kpɔ̀n bǐ'],
  common_no_result: ['Aucun résultat', 'No results', 'Nǔ ma wà'],
  common_error: ['Une erreur est survenue', 'An error occurred', 'Fɔ̀ ɖé ɖò'],
  common_retry: ['Réessayer', 'Retry', 'Dó tɔ̀n'],
  common_empty: ['Aucun élément', 'Nothing here', 'Nǔ ma ɖè'],
  common_go_back: ['Retour', 'Go back', 'Yì sín'],
  common_email_placeholder: ['Adresse email', 'Email address', 'Email towe'],
  common_password_placeholder: ['Mot de passe', 'Password', 'Xó lɛ'],
  common_send: ['Envoyer', 'Send', 'Sɛ̀n'],
  common_validate: ['Valider', 'Validate', 'Gbɔ̀n'],

  // LOGIN
  login_welcome: ['Bon retour 👋', 'Welcome back 👋', 'Awa tɔ̀n 👋'],
  login_subtitle: ['Connectez-vous à votre compte MANG', 'Sign in to your MANG account', 'Nɔ sú MANG kɔntu towe'],
  login_google_btn: ['Continuer avec Google', 'Continue with Google', 'Yì Google mɛ'],
  login_google_redirecting: ['Redirection...', 'Redirecting...', 'É nɔ yì...'],
  login_forgot_password: ['Mot de passe oublié ?', 'Forgot password?', 'A wà xó lɛ ?'],
  login_loading: ['Connexion...', 'Signing in...', 'É nɔ sú...'],
  login_btn: ['Se connecter', 'Sign in', 'Nɔ sú'],
  login_guest_btn: ["Entrer en tant qu'invité", 'Continue as guest', 'Yì dó hwenu'],
  login_guest_toast: ['Mode invité activé (lecture seule)', 'Guest mode activated (read only)', 'Hwenu gán (xà kan)'],
  login_no_account: ['Pas encore de compte ?', 'No account yet?', 'Kɔntu ma ɖè ?'],
  login_signup_link: ["S'inscrire", 'Sign up', 'Wlan towe'],
  login_error: ['Email ou mot de passe incorrect', 'Incorrect email or password', 'Email abǐ xó lɛ klɔ̌'],
  login_google_error: ['Connexion Google impossible', 'Google sign-in failed', 'Google sín ɔ klɔ̌'],

  // REGISTER
  register_title: ['Créer un compte 🌱', 'Create an account 🌱', 'Wlan kɔntu 🌱'],
  register_subtitle: ['Rejoignez la communauté MANG', 'Join the MANG community', 'Nɔ sú MANG communauté'],
  register_firstname: ['Prénom', 'First name', 'Nyikɔ nukɔntɔn'],
  register_lastname: ['Nom', 'Last name', 'Nyikɔ'],
  register_username: ["Nom d'utilisateur", 'Username', 'Nyikɔ appli'],
  register_btn: ['Créer mon compte', 'Create my account', 'Wlan kɔntu ce'],
  register_loading: ['Création en cours...', 'Creating account...', 'É nɔ wlan...'],
  register_has_account: ['Déjà un compte ?', 'Already have an account?', 'Kɔntu ɖè kpɔ́n ?'],
  register_login_link: ['Se connecter', 'Sign in', 'Nɔ sú'],
  register_accept_terms: ["J'accepte les conditions d'utilisation", 'I accept the terms of service', 'Un sɔ̀n nǔwalɔ lɛ'],
  register_error_email: ['Email déjà utilisé', 'Email already in use', 'Email lɔ ɖè kpɔ́n'],
  register_success: ['Compte créé ! Vérifiez vos emails ✅', 'Account created! Check your emails ✅', 'Kɔntu wlan ✅ Kpɔ̀n email'],

  // FORGOT PASSWORD
  forgot_title: ['Mot de passe oublié ?', 'Forgot your password?', 'A wà xó lɛ ?'],
  forgot_subtitle: ["Entrez votre email pour recevoir le lien de réinitialisation", 'Enter your email to receive the reset link', 'Wlan email towe bɔ a na mɔ link'],
  forgot_btn: ['Envoyer le lien', 'Send reset link', 'Sɛ̀n link'],
  forgot_loading: ['Envoi en cours...', 'Sending...', 'É nɔ sɛ̀n...'],
  forgot_success: ['Email envoyé ! Vérifiez votre boîte 📧', 'Email sent! Check your inbox 📧', 'Email sɛ̀n ✅ Kpɔ̀n email towe'],
  forgot_back: ['Retour à la connexion', 'Back to sign in', 'Yì sín nɔ sú'],

  // ONBOARDING
  onboarding_continue: ['Continuer', 'Continue', 'Yì nukɔn'],
  onboarding_start: ['Commencer', 'Get started', 'Bɛ̌'],
  onboarding_why_mang: ['Pourquoi choisir MANG ?', 'Why choose MANG?', 'Mɛnu wɛ MANG ?'],
  onboarding_why_subtitle: ['Découvrez comment nous réinventons le commerce agricole au Bénin.', 'Discover how we reinvent agricultural trade in Benin.', 'Mɔ nú e MANG nɔ bló'],
  onboarding_commission: ['0% Commission, Zéro Intermédiaires', '0% Commission, Zero Intermediaries', '0% Commission, Nǔ gbigbé ma ɖè'],
  onboarding_escrow: ['Paiements Escrow MTN / Moov / Celtis', 'Escrow Payments MTN / Moov / Celtis', 'Escrow MTN / Moov / Celtis'],
  onboarding_logistics: ['Réseau de Transporteurs Partenaires', 'Partner Carrier Network', 'Transporteur lɛ'],
  onboarding_shop: ['Boutique & Avis Vérifiés', 'Shop & Verified Reviews', 'Boutique & Avis sɛsɛ lɛ'],
  onboarding_join: ["Rejoignez des milliers d'agriculteurs béninois", 'Join thousands of Beninese farmers', 'Sú agri béninois lɛ'],

  // NOTIFICATIONS
  notif_title: ['Notifications', 'Notifications', 'Notification lɛ'],
  notif_unread: ['{{count}} non lue', '{{count}} unread', '{{count}} ma xà'],
  notif_up_to_date: ['Tout est à jour ✅', 'All caught up ✅', 'Bǐ jɛ nu ✅'],
  notif_mark_all: ['Tout marquer comme lu', 'Mark all as read', 'Sín bǐ xà'],
  notif_delete_all: ['Supprimer toutes les notifications ?', 'Delete all notifications?', 'Zán notification bǐ ?'],
  notif_deleted: ['Notifications supprimées', 'Notifications deleted', 'Notification lɛ zán'],
  notif_marked: ['Toutes marquées comme lues ✅', 'All marked as read ✅', 'Bǐ sín xà ✅'],
  notif_empty_all: ['Aucune notification', 'No notifications', 'Notification ma ɖè'],
  notif_empty_all_sub: ['Vos notifications apparaîtront ici', 'Your notifications will appear here', 'Notification lɛ na wá fí'],
  notif_empty_unread: ['Tout est lu !', 'All caught up!', 'Bǐ xà !'],
  notif_empty_unread_sub: ['Vous êtes à jour sur toutes vos notifications', 'You are up to date on all notifications', 'É jɛ nu bǐ mɛ'],
  notif_empty_orders: ['Aucune commande', 'No orders', 'Commande ma ɖè'],
  notif_empty_orders_sub: ['Vos notifications de commandes apparaîtront ici', 'Your order notifications will appear here', 'Commande notification lɛ na wá fí'],
  notif_empty_social: ['Aucune interaction', 'No interactions', 'Interaction ma ɖè'],
  notif_empty_social_sub: ['Likes, commentaires et abonnements apparaîtront ici', 'Likes, comments and follows will appear here', 'Like, commentaire, abonnement lɛ na wá fí'],
  notif_empty_wallet: ['Aucune transaction', 'No transactions', 'Transaction ma ɖè'],
  notif_empty_wallet_sub: ['Vos mouvements wallet apparaîtront ici', 'Your wallet movements will appear here', 'Wallet mouvement lɛ na wá fí'],
  notif_filter_all: ['Tout', 'All', 'Bǐ'],
  notif_filter_unread: ['Non lus', 'Unread', 'Ma xà lɛ'],
  notif_filter_orders: ['Commandes', 'Orders', 'Commande lɛ'],
  notif_filter_social: ['Social', 'Social', 'Social'],
  notif_filter_wallet: ['Wallet', 'Wallet', 'Wallet'],

  // MARKETPLACE
  marketplace_title: ['Marketplace', 'Marketplace', 'Marketplace'],
  marketplace_search_placeholder: ['Rechercher produits, boutiques...', 'Search products, shops...', 'Sɛ̀kpɔ nǔ, boutique...'],
  marketplace_all: ['Tous', 'All', 'Bǐ'],
  marketplace_categories: ['Catégories', 'Categories', 'Catégorie lɛ'],
  marketplace_shops: ['Boutiques', 'Shops', 'Boutique lɛ'],
  marketplace_products: ['Produits', 'Products', 'Nǔ lɛ'],
  marketplace_community: ['Communauté', 'Community', 'Communauté'],
  marketplace_empty: ['Aucun produit trouvé', 'No products found', 'Nǔ ma wà'],
  marketplace_empty_sub: ['Essayez un autre terme de recherche', 'Try a different search term', 'Sɛ̀kpɔ nǔ ɖevo'],
  marketplace_top_shops: ['Boutiques populaires', 'Popular shops', 'Boutique gbejɔ lɛ'],
  marketplace_new_products: ['Nouveaux produits', 'New products', 'Nǔ yɔyɔ̌ lɛ'],
  marketplace_trending: ['Tendances', 'Trending', 'Tɔn nukɔntɔn'],
  marketplace_add_to_cart: ['Ajouter au panier', 'Add to cart', 'Sɛ̀n panier mɛ'],
  marketplace_order: ['Commander', 'Order', 'Bló commande'],
  marketplace_in_stock: ['En stock', 'In stock', 'É ɖè'],
  marketplace_out_of_stock: ['Rupture de stock', 'Out of stock', 'É vò'],

  // CART
  cart_title: ['Mon panier', 'My cart', 'Panier ce'],
  cart_empty: ['Votre panier est vide', 'Your cart is empty', 'Panier towe kpé'],
  cart_empty_sub: ['Ajoutez des produits depuis le marketplace', 'Add products from the marketplace', 'Sɛ̀n nǔ sín marketplace mɛ'],
  cart_total: ['Total', 'Total', 'Akwɛ bǐ'],
  cart_checkout: ['Passer la commande', 'Checkout', 'Bló commande'],
  cart_remove: ['Supprimer', 'Remove', 'Zán'],
  cart_quantity: ['Quantité', 'Quantity', 'Nɔ̌'],
  cart_items: ['articles', 'items', 'nǔ lɛ'],

  // PROFILE
  profile_edit: ['Modifier le profil', 'Edit profile', 'Sín profil towe'],
  profile_followers: ['Abonnés', 'Followers', 'Mɛ e nɔ lɛ̀kɔ'],
  profile_following: ['Abonnements', 'Following', 'Mɛ e un nɔ lɛ̀kɔ'],
  profile_posts: ['Publications', 'Posts', 'Nǔ lɛ xwlɛ'],
  profile_shop: ['Ma boutique', 'My shop', 'Boutique ce'],
  profile_vendor: ['Espace vendeur', 'Vendor space', 'Fínfɔn dó'],
  profile_wallet: ['Mon portefeuille', 'My wallet', 'Wallet ce'],
  profile_orders: ['Mes commandes', 'My orders', 'Commande ce lɛ'],
  profile_referral: ['Parrainage', 'Referral', 'Wlan mɛ ɖevo'],
  profile_no_posts: ['Aucune publication', 'No posts yet', 'Nǔ ma xwlɛ ɖè'],
  profile_no_posts_sub: ['Partagez votre première publication', 'Share your first post', 'Bló xwlɛ nukɔntɔn towe'],
  profile_bio_placeholder: ['Ajoutez une bio...', 'Add a bio...', 'Wlan bio towe...'],

  // ORDERS
  orders_title: ['Mes commandes', 'My orders', 'Commande ce lɛ'],
  orders_empty: ['Aucune commande', 'No orders yet', 'Commande ma ɖè'],
  orders_empty_sub: ['Vos commandes apparaîtront ici', 'Your orders will appear here', 'Commande lɛ na wá fí'],
  orders_status_pending: ['En attente', 'Pending', 'É ɖè ɖó'],
  orders_status_accepted: ['Acceptée', 'Accepted', 'É sɔ̀n'],
  orders_status_refused: ['Refusée', 'Refused', 'É ma sɔ̀n ó'],
  orders_status_delivered: ['Livrée', 'Delivered', 'É sɛ̀n'],
  orders_status_paid: ['Payée', 'Paid', 'Akwɛ sɛ̀n'],
  orders_total: ['Total', 'Total', 'Akwɛ bǐ'],
  orders_date: ['Date', 'Date', 'Azǎn'],
  orders_details: ['Détails de la commande', 'Order details', 'Commande sín nǔ lɛ'],
  orders_track: ['Suivre la commande', 'Track order', 'Wà commande lɔ kpɔ́n'],
  orders_confirm_delivery: ['Confirmer la réception', 'Confirm delivery', 'Gbɔ̀n mɔ sɛ̀n'],
  orders_cancel: ['Annuler la commande', 'Cancel order', 'Zán commande'],
  orders_as_buyer: ['Mes achats', 'My purchases', 'Nǔ un cɔ lɛ'],
  orders_as_seller: ['Mes ventes', 'My sales', 'Nǔ un dó lɛ'],

  // WALLET
  wallet_title: ['Mon Portefeuille', 'My Wallet', 'Wallet ce'],
  wallet_balance: ['Solde disponible', 'Available balance', 'Akwɛ e ɖè'],
  wallet_send: ['Envoyer', 'Send', 'Sɛ̀n akwɛ'],
  wallet_receive: ['Recevoir', 'Receive', 'Mɔ akwɛ'],
  wallet_withdraw: ['Retirer', 'Withdraw', 'Sɔ akwɛ'],
  wallet_topup: ['Recharger', 'Top up', 'Dó akwɛ'],
  wallet_history: ['Historique', 'History', 'Nǔ e jɛ lɛ'],
  wallet_empty_history: ['Aucune transaction', 'No transactions yet', 'Transaction ma ɖè'],
  wallet_empty_sub: ['Vos transactions apparaîtront ici', 'Your transactions will appear here', 'Transaction lɛ na wá fí'],
  wallet_credit: ['Crédit', 'Credit', 'Akwɛ wá'],
  wallet_debit: ['Débit', 'Debit', 'Akwɛ yì'],
  wallet_amount: ['Montant', 'Amount', 'Akwɛ'],
  wallet_recipient: ['Destinataire', 'Recipient', 'Mɛ e na mɔ'],
  wallet_confirm_send: ['Confirmer le transfert', 'Confirm transfer', 'Gbɔ̀n sɛ̀n akwɛ'],
  wallet_sending: ['Transfert en cours...', 'Sending...', 'É nɔ sɛ̀n...'],
  wallet_success: ['Transfert effectué ✅', 'Transfer successful ✅', 'Akwɛ sɛ̀n ✅'],

  // FAVORITES
  favorites_title: ['Mes favoris', 'My favorites', 'Nǔ e un nɔ jló lɛ'],
  favorites_empty: ['Aucun favori', 'No favorites yet', 'Nǔ ma ɖè'],
  favorites_empty_sub: ['Ajoutez des produits à vos favoris', 'Add products to your favorites', 'Sɛ̀n nǔ sín favoris mɛ'],
  favorites_remove: ['Retirer des favoris', 'Remove from favorites', 'Zán sín favoris'],

  // COMMUNITY
  community_title: ['Communauté', 'Community', 'Communauté'],
  community_new_post: ['Nouvelle publication', 'New post', 'Xwlɛ yɔyɔ̌'],
  community_what_share: ['Quoi de neuf ? Partagez avec la communauté...', "What's new? Share with the community...", 'Nǔ tɔn kɛ́ɖɛ́ ? Bló nú communauté...'],
  community_post: ['Publier', 'Post', 'Xwlɛ'],
  community_like: ["J'aime", 'Like', 'Jɔ nú'],
  community_comment: ['Commenter', 'Comment', 'Dó xó'],
  community_empty: ['Aucune publication', 'No posts yet', 'Xwlɛ ma ɖè'],
  community_empty_sub: ['Soyez le premier à partager !', 'Be the first to share!', 'Kɔ̀n nukɔntɔn xwlɛ !'],
  community_add_comment: ['Ajouter un commentaire...', 'Add a comment...', 'Dó xó...'],
  community_reply: ['Répondre', 'Reply', 'Gbɔ̀n'],
  community_delete_post: ['Supprimer la publication ?', 'Delete post?', 'Zán xwlɛ lɔ ?'],

  // SHOP PUBLIC
  shop_follow: ['Suivre', 'Follow', 'Lɛ̀kɔ'],
  shop_following: ['Abonné', 'Following', 'Un nɔ lɛ̀kɔ'],
  shop_contact: ['Discuter', 'Chat', 'Gbɔ̀n xó'],
  shop_like: ["J'aime", 'Like', 'Jɔ nú'],
  shop_products_tab: ['Produits', 'Products', 'Nǔ lɛ'],
  shop_about_tab: ['À propos', 'About', 'Xó'],
  shop_reviews_tab: ['Avis', 'Reviews', 'Avis lɛ'],
  shop_no_products: ['Aucun produit disponible', 'No products available', 'Nǔ ma ɖè'],
  shop_no_reviews: ['Aucun avis pour le moment', 'No reviews yet', 'Avis ma ɖè'],
  shop_verified: ['Boutique certifiée', 'Certified shop', 'Boutique sɛsɛ'],

  // VENDOR
  vendor_title: ['Espace Vendeur', 'Vendor Space', 'Fínfɔn dó'],
  vendor_dashboard: ['Tableau de bord', 'Dashboard', 'Kpɔ̀n nǔ lɛ'],
  vendor_my_shop: ['Ma boutique', 'My shop', 'Boutique ce'],
  vendor_my_products: ['Mes produits', 'My products', 'Nǔ ce lɛ'],
  vendor_my_orders: ['Commandes reçues', 'Received orders', 'Commande e wà lɛ'],
  vendor_add_product: ['Ajouter un produit', 'Add product', 'Sɛ̀n nǔ'],
  vendor_sales_total: ['Ventes totales', 'Total sales', 'Nǔ dó bǐ'],
  vendor_revenue: ['Revenus', 'Revenue', 'Akwɛ e wà'],
  vendor_no_shop: ['Vous n\'avez pas encore de boutique', 'You don\'t have a shop yet', 'Boutique ma ɖè'],
  vendor_create_shop: ['Créer ma boutique', 'Create my shop', 'Wlan boutique ce'],

  // MESSAGES
  messages_title: ['Messages', 'Messages', 'Message lɛ'],
  messages_new: ['Nouveau message', 'New message', 'Message yɔyɔ̌'],
  messages_empty: ['Aucune conversation', 'No conversations', 'Conversation ma ɖè'],
  messages_empty_sub: ['Démarrez une conversation depuis une boutique', 'Start a conversation from a shop', 'Bɛ̌ xó sín boutique ɖé'],
  messages_type_placeholder: ['Écrivez un message...', 'Write a message...', 'Wlan message...'],
  messages_archived: ['Archivés', 'Archived', 'Archived lɛ'],
  messages_mute: ['Mettre en sourdine', 'Mute', 'Má xó'],
  messages_archive: ['Archiver', 'Archive', 'Archive'],
  messages_delete: ['Supprimer la conversation', 'Delete conversation', 'Zán conversation'],

  // CHECKOUT
  checkout_title: ['Finaliser la commande', 'Checkout', 'Gbɔ̀n commande'],
  checkout_delivery: ['Livraison', 'Delivery', 'Sɛ̀n nǔ'],
  checkout_payment: ['Paiement', 'Payment', 'Akwɛ sɛ̀n'],
  checkout_summary: ['Récapitulatif', 'Summary', 'Nǔ lɛ bǐ'],
  checkout_address: ['Adresse de livraison', 'Delivery address', 'Fínfɔn sɛ̀n nǔ'],
  checkout_total: ['Total à payer', 'Total to pay', 'Akwɛ e na sɛ̀n'],
  checkout_confirm: ['Confirmer la commande', 'Confirm order', 'Gbɔ̀n commande'],
  checkout_placing: ['Commande en cours...', 'Placing order...', 'É nɔ bló commande...'],
  checkout_success: ['Commande passée avec succès ! ✅', 'Order placed successfully! ✅', 'Commande jɛ nu ✅'],

  // PRODUCT DETAIL
  product_add_to_cart: ['Ajouter au panier', 'Add to cart', 'Sɛ̀n panier mɛ'],
  product_order_now: ['Commander maintenant', 'Order now', 'Bló commande sɔgbe'],
  product_description: ['Description', 'Description', 'Xó'],
  product_details: ['Détails', 'Details', 'Nǔ lɛ'],
  product_seller: ['Vendeur', 'Seller', 'Mɛ e nɔ dó'],
  product_reviews: ['Avis clients', 'Customer reviews', 'Avis lɛ'],
  product_in_stock: ['En stock', 'In stock', 'É ɖè'],
  product_out_of_stock: ['Rupture de stock', 'Out of stock', 'É vò'],
  product_quantity: ['Quantité', 'Quantity', 'Nɔ̌'],
  product_unit: ['unité', 'unit', 'ɖò ɖokpo'],
  product_similar: ['Produits similaires', 'Similar products', 'Nǔ e ɖò gɔ̌'],

  // REFERRAL
  referral_title: ['Parrainage', 'Referral', 'Wlan mɛ ɖevo'],
  referral_invite: ['Inviter des amis', 'Invite friends', 'Ylɔ xɔ̌tɔ lɛ'],
  referral_code: ['Mon code de parrainage', 'My referral code', 'Code parrainage ce'],
  referral_copy: ['Copier le code', 'Copy code', 'Hɛ̀n code'],
  referral_copied: ['Code copié !', 'Code copied!', 'Code hɛ̀n ✅'],
  referral_share: ['Partager mon lien', 'Share my link', 'Bló link ce'],
  referral_earned: ['Gains totaux', 'Total earnings', 'Akwɛ e wà bǐ'],
  referral_how_it_works: ['Comment ça marche ?', 'How does it work?', 'É nɔ wà nǔ sɛ́ɖɛ́ ?'],
  referral_step1: ['Partagez votre code', 'Share your code', 'Bló code towe'],
  referral_step2: ["Votre filleul s'inscrit", 'Your friend signs up', 'Xɔ̌tɔ towe wlan'],
  referral_step3: ['Gagnez des récompenses', 'Earn rewards', 'Mɔ récompense'],
};

Object.entries(newKeys).forEach(([key, [frVal, enVal, fonVal]]) => {
  fr[key] = frVal;
  en[key] = enVal;
  fon[key] = fonVal;
});

fs.writeFileSync('src/locales/fr.json', JSON.stringify(fr, null, 2), 'utf8');
fs.writeFileSync('src/locales/en.json', JSON.stringify(en, null, 2), 'utf8');
fs.writeFileSync('src/locales/fon.json', JSON.stringify(fon, null, 2), 'utf8');
console.log('DONE - Added', Object.keys(newKeys).length, 'translation keys');
