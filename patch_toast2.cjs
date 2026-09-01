const fs = require('fs');
let code = fs.readFileSync('src/pages/ShopPublicPage.jsx', 'utf8');

code = code.replace(
  /await supabase\.rpc\('create_notification'/g,
  "const { error: notifErr } = await supabase.rpc('create_notification'"
);

code = code.replace(
  /p_reference_type: 'shop',\s*\}\)/g,
  "p_reference_type: 'shop', })\n          if (notifErr) { console.error(notifErr); alert('Erreur Notif: ' + notifErr.message); }"
);

fs.writeFileSync('src/pages/ShopPublicPage.jsx', code, 'utf8');
