const fs = require('fs');
let code = fs.readFileSync('src/pages/MessagesPage.jsx', 'utf8');

// Replace Archiver label
code = code.replace(
  "{ icon: Archive, label: 'Archiver conversation'",
  "{ icon: Archive, label: (conv.archived_by || []).includes(user?.id) ? 'Désarchiver' : 'Archiver conversation'"
);

// Replace Mute label
code = code.replace(
  "{ icon: Bell,    label: 'Notifications (Mute)'",
  "{ icon: Bell,    label: (conv.muted_by || []).includes(user?.id) ? 'Activer les notifications' : 'Rendre silencieux'"
);

fs.writeFileSync('src/pages/MessagesPage.jsx', code, 'utf8');
