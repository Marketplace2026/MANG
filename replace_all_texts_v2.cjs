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
    if (count > 0) console.log('OK:', filePath, '(' + count + ' replacements)');
    return count;
  } catch(e) {
    console.error('FAIL:', filePath, e.message);
    return 0;
  }
}

let total = 0;

// ===== MARKETPLACE PAGE (corrected patterns) =====
total += replaceInFile('src/pages/MarketplacePage.jsx', [
  ['placeholder="Rechercher des produits, boutiques..."', "placeholder={t('marketplace_search_placeholder')}"],
  [">Tous les produits\n            </button>", ">{t('marketplace_products')}\n            </button>"],
  [">Toutes les Boutiques<", ">{t('marketplace_shops')}<"],
  ['? (searchTab === \'shops\' ? \'Boutiques correspondantes\' : \'Produits correspondants\')', "? (searchTab === 'shops' ? t('marketplace_shops') : t('marketplace_products'))"],
]);

// ===== ORDERS PAGE =====
total += replaceInFile('src/pages/OrdersPage.jsx', [
  ["'En attente'", "t('orders_status_pending')"],
  ["'Accept\u00e9e'", "t('orders_status_accepted')"],
  ["'Refus\u00e9e'", "t('orders_status_refused')"],
  ["'Livr\u00e9e'", "t('orders_status_delivered')"],
  [">Mes achats<", ">{t('orders_as_buyer')}<"],
  [">Mes ventes<", ">{t('orders_as_seller')}<"],
  [">Aucune commande<", ">{t('orders_empty')}<"],
  ['Vos commandes apparaîtront ici', "{t('orders_empty_sub')}"],
]);

// ===== WALLET PAGE =====
total += replaceInFile('src/pages/WalletPage.jsx', [
  [">Solde disponible<", ">{t('wallet_balance')}<"],
  [">Envoyer<", ">{t('wallet_send')}<"],
  [">Retirer<", ">{t('wallet_withdraw')}<"],
  [">Recharger<", ">{t('wallet_topup')}<"],
  [">Historique<", ">{t('wallet_history')}<"],
  [">Aucune transaction<", ">{t('wallet_empty_history')}<"],
  ['Vos transactions apparaîtront ici', "{t('wallet_empty_sub')}"],
]);

// ===== FAVORITES PAGE =====
total += replaceInFile('src/pages/FavoritesPage.jsx', [
  [">Mes favoris<", ">{t('favorites_title')}<"],
  [">Aucun favori<", ">{t('favorites_empty')}<"],
  ['Ajoutez des produits à vos favoris', "{t('favorites_empty_sub')}"],
]);

// ===== PROFILE PAGE =====
total += replaceInFile('src/pages/ProfilePage.jsx', [
  [">Modifier le profil<", ">{t('profile_edit')}<"],
  [">Abonn\u00e9s<", ">{t('profile_followers')}<"],
  [">Abonnements<", ">{t('profile_following')}<"],
  [">Publications<", ">{t('profile_posts')}<"],
  [">Ma boutique<", ">{t('profile_shop')}<"],
  [">Espace vendeur<", ">{t('profile_vendor')}<"],
  [">Mon portefeuille<", ">{t('profile_wallet')}<"],
  [">Mes commandes<", ">{t('profile_orders')}<"],
  [">Parrainage<", ">{t('profile_referral')}<"],
  [">Aucune publication<", ">{t('profile_no_posts')}<"],
]);

// ===== PRODUCT DETAIL =====
total += replaceInFile('src/pages/ProductDetailPage.jsx', [
  [">Ajouter au panier<", ">{t('product_add_to_cart')}<"],
  [">Commander maintenant<", ">{t('product_order_now')}<"],
  [">Description<", ">{t('product_description')}<"],
  [">D\u00e9tails<", ">{t('product_details')}<"],
  [">Avis clients<", ">{t('product_reviews')}<"],
  [">Produits similaires<", ">{t('product_similar')}<"],
  [">En stock<", ">{t('product_in_stock')}<"],
  [">Rupture de stock<", ">{t('product_out_of_stock')}<"],
]);

// ===== SHOP PUBLIC PAGE =====
total += replaceInFile('src/pages/ShopPublicPage.jsx', [
  [">Suivre<", ">{t('shop_follow')}<"],
  [">Abonn\u00e9<", ">{t('shop_following')}<"],
  [">Discuter<", ">{t('shop_contact')}<"],
  [">Produits<", ">{t('shop_products_tab')}<"],
  [">Avis<", ">{t('shop_reviews_tab')}<"],
  [">À propos<", ">{t('shop_about_tab')}<"],
  ["'Aucun produit disponible'", "t('shop_no_products')"],
  ["'Aucun avis pour le moment'", "t('shop_no_reviews')"],
]);

// ===== VENDOR PAGE =====
total += replaceInFile('src/pages/VendorPage.jsx', [
  [">Tableau de bord<", ">{t('vendor_dashboard')}<"],
  [">Mes produits<", ">{t('vendor_my_products')}<"],
  [">Commandes re\u00e7ues<", ">{t('vendor_my_orders')}<"],
  [">Ajouter un produit<", ">{t('vendor_add_product')}<"],
  [">Revenus<", ">{t('vendor_revenue')}<"],
  [">Ventes totales<", ">{t('vendor_sales_total')}<"],
  ["\"Vous n'avez pas encore de boutique\"", "t('vendor_no_shop')"],
  [">Cr\u00e9er ma boutique<", ">{t('vendor_create_shop')}<"],
]);

// ===== MESSAGES PAGE =====
total += replaceInFile('src/pages/MessagesPage.jsx', [
  ['placeholder="Écrivez un message..."', "placeholder={t('messages_type_placeholder')}"],
  [">Mettre en sourdine<", ">{t('messages_mute')}<"],
  [">Archiver<", ">{t('messages_archive')}<"],
  [">Aucune conversation<", ">{t('messages_empty')}<"],
  [">D\u00e9marrez une conversation depuis une boutique<", ">{t('messages_empty_sub')}<"],
]);

// ===== CHECKOUT PAGE =====
total += replaceInFile('src/pages/CheckoutPage.jsx', [
  [">Livraison<", ">{t('checkout_delivery')}<"],
  [">Paiement<", ">{t('checkout_payment')}<"],
  [">R\u00e9capitulatif<", ">{t('checkout_summary')}<"],
  [">Total \u00e0 payer<", ">{t('checkout_total')}<"],
  [">Confirmer la commande<", ">{t('checkout_confirm')}<"],
  [">Commande en cours...<", ">{t('checkout_placing')}<"],
  ["'Commande pass\u00e9e avec succ\u00e8s ! \u2705'", "t('checkout_success')"],
]);

// ===== ONBOARDING PAGE =====
total += replaceInFile('src/pages/OnboardingPage.jsx', [
  ["Continuer\n            <ArrowRight", "{ t('onboarding_continue') }\n            <ArrowRight"],
  ["Commencer\n            <ArrowRight", "{ t('onboarding_start') }\n            <ArrowRight"],
  [">Pourquoi choisir MANG ?<", ">{t('onboarding_why_mang')}<"],
  [">0% Commission, Z\u00e9ro Interm\u00e9diaires<", ">{t('onboarding_commission')}<"],
  [">R\u00e9seau de Transporteurs Partenaires<", ">{t('onboarding_logistics')}<"],
]);

// ===== COMMUNITY PAGE =====
total += replaceInFile('src/pages/CommunityPage.jsx', [
  ['placeholder="Quoi de neuf ? Partagez avec la communaut\u00e9..."', "placeholder={t('community_what_share')}"],
  [">Publier<", ">{t('community_post')}<"],
  [">R\u00e9pondre<", ">{t('community_reply')}<"],
  [">Aucune publication<", ">{t('community_empty')}<"],
  ["Soyez le premier \u00e0 partager !", "{t('community_empty_sub')}"],
]);

// ===== FORGOT PASSWORD PAGE =====
total += replaceInFile('src/pages/ForgotPasswordPage.jsx', [
  [">Envoyer le lien<", ">{t('forgot_btn')}<"],
  [">Retour \u00e0 la connexion<", ">{t('forgot_back')}<"],
  ["Envoi en cours...", "t('forgot_loading')"],
]);

// ===== REFERRAL PAGE =====
total += replaceInFile('src/pages/ReferralPage.jsx', [
  [">Parrainage<", ">{t('referral_title')}<"],
  [">Mon code de parrainage<", ">{t('referral_code')}<"],
  [">Copier le code<", ">{t('referral_copy')}<"],
  [">Partager mon lien<", ">{t('referral_share')}<"],
  [">Comment \u00e7a marche ?<", ">{t('referral_how_it_works')}<"],
  ["'Code copi\u00e9 !'", "t('referral_copied')"],
]);

// ===== CART PAGE =====
total += replaceInFile('src/pages/CartPage.jsx', [
  [">Mon panier<", ">{t('cart_title')}<"],
  [">Votre panier est vide<", ">{t('cart_empty')}<"],
  [">Total<", ">{t('cart_total')}<"],
  [">Passer la commande<", ">{t('cart_checkout')}<"],
  ["Ajoutez des produits depuis le marketplace", "{t('cart_empty_sub')}"],
]);

// ===== NOTIFICATIONS PAGE =====
total += replaceInFile('src/pages/NotificationsPage.jsx', [
  [">Notifications<", ">{t('notif_title')}<"],
  ["Tout est \u00e0 jour \u2705", "t('notif_up_to_date')"],
  ["'Toutes marqu\u00e9es comme lues \u2705'", "t('notif_marked')"],
  ["'Notifications supprim\u00e9es'", "t('notif_deleted')"],
]);

console.log('\n=== PASS 2 TOTAL REPLACEMENTS:', total, '===');
