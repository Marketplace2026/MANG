const fs = require('fs');
const fr = JSON.parse(fs.readFileSync('src/locales/fr.json', 'utf8'));
const en = JSON.parse(fs.readFileSync('src/locales/en.json', 'utf8'));
const fon = JSON.parse(fs.readFileSync('src/locales/fon.json', 'utf8'));

const missing = {
  notifPromos: ['Promotions', 'Promotions', 'Promotion lɛ'],
  notifPromosSub: ['Offres et réductions', 'Deals and discounts', 'Nǔ dó lɛ'],
  privacySecurity: ['Confidentialité & Sécurité', 'Privacy & Security', 'Confidentiel & Sécurité'],
  shareLocation: ['Partager ma localisation', 'Share my location', 'Dó fínfɔn ce'],
  shareLocationOn: ['Localisation activée', 'Location enabled', 'Fínfɔn ɖè'],
  shareLocationOff: ['Localisation désactivée', 'Location disabled', 'Fínfɔn má ɖè ó'],
  publicProfile: ['Profil public', 'Public profile', 'Profil gbejɔ'],
  publicProfileOn: ['Visible par tous', 'Visible to everyone', 'Mɛ bǐ na mɔ'],
  publicProfileOff: ['Visible uniquement par vos abonnés', 'Only visible to followers', 'Mɛ lɛ e nɔ lɛ̀kɔ kan'],
};

Object.entries(missing).forEach(([key, [frVal, enVal, fonVal]]) => {
  if (!fr[key]) fr[key] = frVal;
  if (!en[key]) en[key] = enVal;
  if (!fon[key]) fon[key] = fonVal;
});

fs.writeFileSync('src/locales/fr.json', JSON.stringify(fr, null, 2), 'utf8');
fs.writeFileSync('src/locales/en.json', JSON.stringify(en, null, 2), 'utf8');
fs.writeFileSync('src/locales/fon.json', JSON.stringify(fon, null, 2), 'utf8');
console.log('Done - added missing keys');
