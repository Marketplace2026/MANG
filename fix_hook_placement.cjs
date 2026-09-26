const fs = require('fs');

// Ces pages ont le hook mal positionné - on va le retirer et le remettre au bon endroit
const pagesToFix = [
  'src/pages/LoginPage.jsx',
  'src/pages/RegisterPage.jsx',
  'src/pages/ForgotPasswordPage.jsx',
  'src/pages/OnboardingPage.jsx',
  'src/pages/NotificationsPage.jsx',
  'src/pages/ReferralPage.jsx',
  'src/pages/CartPage.jsx',
  'src/pages/PublicProfilePage.jsx',
  'src/pages/OrdersPage.jsx',
  'src/pages/WalletPage.jsx',
  'src/pages/FavoritesPage.jsx',
  'src/pages/ProfilePage.jsx',
  'src/pages/MarketplacePage.jsx',
  'src/pages/ProductDetailPage.jsx',
  'src/pages/CommunityPage.jsx',
  'src/pages/ShopPublicPage.jsx',
  'src/pages/VendorPage.jsx',
  'src/pages/MessagesPage.jsx',
  'src/pages/CheckoutPage.jsx',
  'src/pages/AdminVerificationPage.jsx',
];

let fixed = 0;

pagesToFix.forEach(filePath => {
  try {
    let code = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // Étape 1: Supprimer toute ligne "const { t } = useTranslation()" mal placée
    // (on va les supprimer toutes, puis en remettre une seule au bon endroit)
    const hookLine = "const { t } = useTranslation()";
    const hookCount = (code.match(/const \{ t \} = useTranslation\(\)/g) || []).length;
    
    if (hookCount === 0) {
      // Pas de hook - rien à faire pour cette page
      console.log('SKIP (no hook):', filePath);
      return;
    }

    // Supprimer toutes les occurrences du hook
    code = code.replace(/\n  const \{ t \} = useTranslation\(\)/g, '');
    code = code.replace(/\nconst \{ t \} = useTranslation\(\)/g, '');
    code = code.replace(/const \{ t \} = useTranslation\(\)\n/g, '');

    // Étape 2: Trouver l'export default function principal
    // Cherche "export default function NomPage()" ou "export default function NomPage() {"
    const exportMatch = code.match(/export default function \w+\([^)]*\)\s*\{/);
    
    if (!exportMatch) {
      console.log('WARN (no export default function):', filePath);
      // Quand même sauvegarder pour enlever le hook mal placé
      fs.writeFileSync(filePath, code, 'utf8');
      return;
    }

    // Trouver l'index du premier '{' après l'export default function
    const exportIdx = code.indexOf(exportMatch[0]);
    const openBraceIdx = exportIdx + exportMatch[0].lastIndexOf('{');
    
    // Trouver la première ligne de code dans la fonction (après le '{')
    const afterBrace = code.indexOf('\n', openBraceIdx) + 1;
    
    // Insérer le hook comme première ligne du composant
    code = code.slice(0, afterBrace) + '  const { t } = useTranslation()\n' + code.slice(afterBrace);
    
    fs.writeFileSync(filePath, code, 'utf8');
    fixed++;
    console.log(`FIXED (${hookCount} hook(s) -> 1 at right place):`, filePath);
    
  } catch(e) {
    console.error('ERROR:', filePath, e.message);
  }
});

console.log('\nTotal fixed:', fixed, '/', pagesToFix.length);
