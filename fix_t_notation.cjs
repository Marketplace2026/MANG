const fs = require('fs');

let code = fs.readFileSync('src/pages/SettingsPage.jsx', 'utf8');

// Liste de toutes les clés utilisées avec la notation t.KEY => t('KEY')
const keys = [
  'settings', 'myAccount', 'editProfile', 'editProfileSub',
  'email', 'phone', 'phoneEmpty', 'security', 'securitySub',
  'notifications', 'notifPush', 'notifPushSub', 'notifOrders', 'notifOrdersSub',
  'notifMessages', 'notifMessagesSub', 'notifPromos', 'notifPromosSub',
  'privacySecurity', 'shareLocation', 'shareLocationOn', 'shareLocationOff',
  'publicProfile', 'publicProfileOn', 'publicProfileOff',
  'twoFA', 'twoFASub', 'deleteAccount', 'deleteAccountSub',
  'appearanceLanguage', 'language', 'theme', 'themeDark', 'themeLight',
  'helpSupport', 'faq', 'faqSub', 'whatsapp', 'whatsappSub',
  'reportProblem', 'reportProblemSub', 'legalInfo', 'cgu', 'privacy',
  'about', 'aboutSub', 'logout', 'logoutConfirm',
  'save', 'cancel', 'update', 'currentPassword', 'newPassword', 'confirmPassword',
  'deleteType', 'deleteBtn', 'security',
];

let count = 0;
keys.forEach(key => {
  // Replace t.KEY with t('KEY') - but only when it's a property access, not t.something.else
  const regex = new RegExp(`\\bt\\.${key}\\b`, 'g');
  const before = code;
  code = code.replace(regex, `t('${key}')`);
  if (code !== before) count++;
});

fs.writeFileSync('src/pages/SettingsPage.jsx', code, 'utf8');
console.log(`Fixed ${count} keys - converted t.KEY to t('KEY')`);
