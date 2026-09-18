const fs = require('fs');

function replaceInFile(filePath, pairs) {
  try {
    let code = fs.readFileSync(filePath, 'utf8');
    let count = 0;
    pairs.forEach(([from, to]) => {
      if (code.includes(from)) {
        code = code.split(from).join(to);
        count++;
      }
    });
    fs.writeFileSync(filePath, code, 'utf8');
    console.log('OK:', filePath, '(' + count + ' replacements)');
    return count;
  } catch(e) {
    console.error('FAIL:', filePath, e.message);
    return 0;
  }
}

let total = 0;

// ===== LOGIN PAGE =====
total += replaceInFile('src/pages/LoginPage.jsx', [
  ['Bon retour \uD83D\uDC4B', "{t('login_welcome')}"],
  ['>Connectez-vous \u00e0 votre compte MANG<', ">{t('login_subtitle')}<"],
  ['>Continuer avec Google<', ">{t('login_google_btn')}<"],
  ['>Redirection...<', ">{t('login_google_redirecting')}<"],
  ['>Mot de passe oubli\u00e9 ?<', ">{t('login_forgot_password')}<"],
  ['? \'Connexion...\' : \'Se connecter\'', "? t('login_loading') : t('login_btn')"],
  ['>Entrer en tant qu\'invit\u00e9<', ">{t('login_guest_btn')}<"],
  ['>Pas encore de compte ?<', ">{t('login_no_account')}<"],
  ['>S\'inscrire<', ">{t('login_signup_link')}<"],
  ['placeholder="Adresse email"', "placeholder={t('common_email_placeholder')}"],
  ['placeholder="Mot de passe"', "placeholder={t('common_password_placeholder')}"],
  ["toast.error('Email ou mot de passe incorrect')", "toast.error(t('login_error'))"],
  ["toast.error('Connexion Google impossible')", "toast.error(t('login_google_error'))"],
  ["toast.success(\"Mode invit\u00e9 activ\u00e9 (lecture seule)\")", "toast.success(t('login_guest_toast'))"],
]);

// ===== FORGOT PASSWORD =====
total += replaceInFile('src/pages/ForgotPasswordPage.jsx', [
  ['>Envoyer le lien<', ">{t('forgot_btn')}<"],
  ['>Envoi en cours...<', ">{t('forgot_loading')}<"],
  ['>Retour \u00e0 la connexion<', ">{t('forgot_back')}<"],
]);

// ===== ONBOARDING =====
total += replaceInFile('src/pages/OnboardingPage.jsx', [
  ['>Continuer<', ">{t('onboarding_continue')}<"],
  ['>Commencer<', ">{t('onboarding_start')}<"],
  ['>Pourquoi choisir MANG ?<', ">{t('onboarding_why_mang')}<"],
]);

// ===== NOTIFICATIONS PAGE =====
total += replaceInFile('src/pages/NotificationsPage.jsx', [
  ['>Notifications<', ">{t('notif_title')}<"],
  ["'Tout est \u00e0 jour \u2705'", "t('notif_up_to_date')"],
  ['>Tout<', ">{t('notif_filter_all')}<"],
  ['>Non lus<', ">{t('notif_filter_unread')}<"],
  ['>Commandes<', ">{t('notif_filter_orders')}<"],
  ['>Social<', ">{t('notif_filter_social')}<"],
  ['>Wallet<', ">{t('notif_filter_wallet')}<"],
  ["'Toutes marquées comme lues ✅'", "t('notif_marked')"],
  ["'Notifications supprimées'", "t('notif_deleted')"],
  ["'Supprimer toutes les notifications ?'", "t('notif_delete_all')"],
]);

// ===== MARKETPLACE PAGE =====
total += replaceInFile('src/pages/MarketplacePage.jsx', [
  ['placeholder="Rechercher produits, boutiques..."', "placeholder={t('marketplace_search_placeholder')}"],
  ['>Tous<', ">{t('marketplace_all')}<"],
  ['>Catégories<', ">{t('marketplace_categories')}<"],
  ['>Boutiques<', ">{t('marketplace_shops')}<"],
  ['>Produits<', ">{t('marketplace_products')}<"],
  ['>Ajouter au panier<', ">{t('marketplace_add_to_cart')}<"],
  ['>Commander<', ">{t('marketplace_order')}<"],
  ['>En stock<', ">{t('marketplace_in_stock')}<"],
  ['>Rupture de stock<', ">{t('marketplace_out_of_stock')}<"],
]);

// ===== CART PAGE =====
total += replaceInFile('src/pages/CartPage.jsx', [
  ['>Mon panier<', ">{t('cart_title')}<"],
  ['>Votre panier est vide<', ">{t('cart_empty')}<"],
  ['>Total<', ">{t('cart_total')}<"],
  ['>Passer la commande<', ">{t('cart_checkout')}<"],
  ['>Supprimer<', ">{t('cart_remove')}<"],
]);

// ===== ORDERS PAGE =====
total += replaceInFile('src/pages/OrdersPage.jsx', [
  ['>Mes commandes<', ">{t('orders_title')}<"],
  ['>En attente<', ">{t('orders_status_pending')}<"],
  ['>Acceptée<', ">{t('orders_status_accepted')}<"],
  ['>Refusée<', ">{t('orders_status_refused')}<"],
  ['>Livrée<', ">{t('orders_status_delivered')}<"],
  ['>Mes achats<', ">{t('orders_as_buyer')}<"],
  ['>Mes ventes<', ">{t('orders_as_seller')}<"],
  ['>Confirmer la réception<', ">{t('orders_confirm_delivery')}<"],
]);

// ===== WALLET PAGE =====
total += replaceInFile('src/pages/WalletPage.jsx', [
  ['>Mon Portefeuille<', ">{t('wallet_title')}<"],
  ['>Solde disponible<', ">{t('wallet_balance')}<"],
  ['>Envoyer<', ">{t('wallet_send')}<"],
  ['>Retirer<', ">{t('wallet_withdraw')}<"],
  ['>Recharger<', ">{t('wallet_topup')}<"],
  ['>Historique<', ">{t('wallet_history')}<"],
  ['>Aucune transaction<', ">{t('wallet_empty_history')}<"],
]);

// ===== FAVORITES PAGE =====
total += replaceInFile('src/pages/FavoritesPage.jsx', [
  ['>Mes favoris<', ">{t('favorites_title')}<"],
  ['>Aucun favori<', ">{t('favorites_empty')}<"],
]);

// ===== REFERRAL PAGE =====
total += replaceInFile('src/pages/ReferralPage.jsx', [
  ['>Parrainage<', ">{t('referral_title')}<"],
  ['>Mon code de parrainage<', ">{t('referral_code')}<"],
  ['>Copier le code<', ">{t('referral_copy')}<"],
  ['>Partager mon lien<', ">{t('referral_share')}<"],
  ['>Gains totaux<', ">{t('referral_earned')}<"],
  ['>Comment \u00e7a marche ?<', ">{t('referral_how_it_works')}<"],
]);

// ===== COMMUNITY PAGE =====
total += replaceInFile('src/pages/CommunityPage.jsx', [
  ['>Communaut\u00e9<', ">{t('community_title')}<"],
  ['>Publier<', ">{t('community_post')}<"],
  [">J'aime<", ">{t('community_like')}<"],
  ['>Commenter<', ">{t('community_comment')}<"],
  ['>R\u00e9pondre<', ">{t('community_reply')}<"],
]);

// ===== MESSAGES PAGE =====
total += replaceInFile('src/pages/MessagesPage.jsx', [
  ['>Messages<', ">{t('messages_title')}<"],
  ['>Archiv\u00e9s<', ">{t('messages_archived')}<"],
  ['placeholder="Écrivez un message..."', "placeholder={t('messages_type_placeholder')}"],
  ['>Mettre en sourdine<', ">{t('messages_mute')}<"],
  ['>Archiver<', ">{t('messages_archive')}<"],
]);

// ===== SHOP PUBLIC PAGE =====
total += replaceInFile('src/pages/ShopPublicPage.jsx', [
  ['>Suivre<', ">{t('shop_follow')}<"],
  ['>Abonn\u00e9<', ">{t('shop_following')}<"],
  ['>Discuter<', ">{t('shop_contact')}<"],
  ['>Produits<', ">{t('shop_products_tab')}<"],
  ['>Avis<', ">{t('shop_reviews_tab')}<"],
  ['>À propos<', ">{t('shop_about_tab')}<"],
]);

// ===== VENDOR PAGE =====
total += replaceInFile('src/pages/VendorPage.jsx', [
  ['>Espace Vendeur<', ">{t('vendor_title')}<"],
  ['>Tableau de bord<', ">{t('vendor_dashboard')}<"],
  ['>Mes produits<', ">{t('vendor_my_products')}<"],
  ['>Commandes re\u00e7ues<', ">{t('vendor_my_orders')}<"],
  ['>Ajouter un produit<', ">{t('vendor_add_product')}<"],
  ['>Revenus<', ">{t('vendor_revenue')}<"],
  ['>Ventes totales<', ">{t('vendor_sales_total')}<"],
]);

// ===== PRODUCT DETAIL =====
total += replaceInFile('src/pages/ProductDetailPage.jsx', [
  ['>Ajouter au panier<', ">{t('product_add_to_cart')}<"],
  ['>Commander maintenant<', ">{t('product_order_now')}<"],
  ['>Description<', ">{t('product_description')}<"],
  ['>D\u00e9tails<', ">{t('product_details')}<"],
  ['>Avis clients<', ">{t('product_reviews')}<"],
  ['>Produits similaires<', ">{t('product_similar')}<"],
  ['>En stock<', ">{t('product_in_stock')}<"],
  ['>Rupture de stock<', ">{t('product_out_of_stock')}<"],
]);

// ===== PROFILE PAGE =====
total += replaceInFile('src/pages/ProfilePage.jsx', [
  ['>Modifier le profil<', ">{t('profile_edit')}<"],
  ['>Abonn\u00e9s<', ">{t('profile_followers')}<"],
  ['>Abonnements<', ">{t('profile_following')}<"],
  ['>Publications<', ">{t('profile_posts')}<"],
  ['>Ma boutique<', ">{t('profile_shop')}<"],
  ['>Espace vendeur<', ">{t('profile_vendor')}<"],
  ['>Mon portefeuille<', ">{t('profile_wallet')}<"],
  ['>Mes commandes<', ">{t('profile_orders')}<"],
  ['>Parrainage<', ">{t('profile_referral')}<"],
]);

// ===== CHECKOUT PAGE =====
total += replaceInFile('src/pages/CheckoutPage.jsx', [
  ['>Finaliser la commande<', ">{t('checkout_title')}<"],
  ['>Livraison<', ">{t('checkout_delivery')}<"],
  ['>Paiement<', ">{t('checkout_payment')}<"],
  ['>R\u00e9capitulatif<', ">{t('checkout_summary')}<"],
  ['>Total \u00e0 payer<', ">{t('checkout_total')}<"],
  ['>Confirmer la commande<', ">{t('checkout_confirm')}<"],
  ['>Commande en cours...<', ">{t('checkout_placing')}<"],
]);

console.log('\n=== TOTAL REPLACEMENTS:', total, '===');
