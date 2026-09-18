const fs = require('fs');

function addI18nToPage(filePath, hookLine) {
  let code = fs.readFileSync(filePath, 'utf8');
  
  // Add import if not already present
  if (!code.includes("from 'react-i18next'") && !code.includes('from "react-i18next"')) {
    // Insert after first import line
    const firstImportEnd = code.indexOf('\n', code.indexOf('import '));
    code = code.slice(0, firstImportEnd + 1) + "import { useTranslation } from 'react-i18next'\n" + code.slice(firstImportEnd + 1);
  }
  
  // Add hook in first export default function or function component
  if (!code.includes('useTranslation()') && hookLine) {
    code = code.replace(hookLine, hookLine + '\n  const { t } = useTranslation()');
  }
  
  fs.writeFileSync(filePath, code, 'utf8');
}

const pages = [
  ['src/pages/LoginPage.jsx', 'const navigate = useNavigate()'],
  ['src/pages/RegisterPage.jsx', 'const navigate = useNavigate()'],
  ['src/pages/ForgotPasswordPage.jsx', 'const navigate = useNavigate()'],
  ['src/pages/OnboardingPage.jsx', 'const navigate = useNavigate()'],
  ['src/pages/NotificationsPage.jsx', 'const { user } = useAuthStore()'],
  ['src/pages/ReferralPage.jsx', 'const navigate = useNavigate()'],
  ['src/pages/CartPage.jsx', 'const navigate = useNavigate()'],
  ['src/pages/PublicProfilePage.jsx', 'const navigate = useNavigate()'],
  ['src/pages/OrdersPage.jsx', 'const navigate = useNavigate()'],
  ['src/pages/WalletPage.jsx', 'const navigate = useNavigate()'],
  ['src/pages/FavoritesPage.jsx', 'const navigate = useNavigate()'],
  ['src/pages/ProfilePage.jsx', 'const navigate = useNavigate()'],
  ['src/pages/MarketplacePage.jsx', 'const navigate = useNavigate()'],
  ['src/pages/ProductDetailPage.jsx', 'const navigate = useNavigate()'],
  ['src/pages/CommunityPage.jsx', 'const navigate = useNavigate()'],
  ['src/pages/ShopPublicPage.jsx', 'const navigate = useNavigate()'],
  ['src/pages/VendorPage.jsx', 'const navigate = useNavigate()'],
  ['src/pages/MessagesPage.jsx', 'const navigate = useNavigate()'],
  ['src/pages/CheckoutPage.jsx', 'const navigate = useNavigate()'],
  ['src/pages/AdminVerificationPage.jsx', 'const navigate = useNavigate()'],
];

let done = 0;
pages.forEach(([path, hookLine]) => {
  try {
    addI18nToPage(path, hookLine);
    done++;
    console.log('OK:', path);
  } catch(e) {
    console.error('FAIL:', path, e.message);
  }
});
console.log('\nDone:', done, '/', pages.length);
