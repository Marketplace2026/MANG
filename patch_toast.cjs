const fs = require('fs');
let code = fs.readFileSync('src/pages/ShopPublicPage.jsx', 'utf8');

code = code.replace(
  "await supabase.rpc('create_notification', {\n            p_user_id: shop.owner_id, p_type: 'shop_follow',",
  "const { error: notifErr } = await supabase.rpc('create_notification', {\n            p_user_id: shop.owner_id, p_type: 'shop_follow',"
).replace(
  "p_reference_id: shop.id, p_reference_type: 'shop',\n          })",
  "p_reference_id: shop.id, p_reference_type: 'shop',\n          })\n          if (notifErr) { console.error('Notif error:', notifErr); toast.error('Erreur Notif: ' + notifErr.message); }"
);

code = code.replace(
  "await supabase.rpc('create_notification', {\n            p_user_id: shop.owner_id, p_type: 'shop_like',",
  "const { error: notifErr2 } = await supabase.rpc('create_notification', {\n            p_user_id: shop.owner_id, p_type: 'shop_like',"
).replace(
  "p_reference_id: shop.id, p_reference_type: 'shop',\n          })\n        }",
  "p_reference_id: shop.id, p_reference_type: 'shop',\n          })\n          if (notifErr2) { console.error('Notif error:', notifErr2); toast.error('Erreur Notif: ' + notifErr2.message); }\n        }"
);

fs.writeFileSync('src/pages/ShopPublicPage.jsx', code, 'utf8');
