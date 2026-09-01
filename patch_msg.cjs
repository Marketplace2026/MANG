const fs = require('fs');
let code = fs.readFileSync('src/pages/MessagesPage.jsx', 'utf8');

// Replace filtered conv logic
code = code.replace(
  "const matchSearch = !q || (other?.username || '').toLowerCase().includes(q) || (c.shop?.name || '').toLowerCase().includes(q) || (c.last_message || '').toLowerCase().includes(q)",
  "const matchSearch = !q || (other?.username || '').toLowerCase().includes(q) || (c.shop?.name || '').toLowerCase().includes(q) || (c.last_message || '').toLowerCase().includes(q);\n      const isArchived = Array.isArray(c.archived_by) && c.archived_by.includes(user?.id);\n      if (tab === 'archive') return matchSearch && isArchived;\n      if (isArchived) return false;"
);

// Replace Tabs
code = code.replace(
  "label: 'Non lus',  badge: unreadTotal },",
  "label: 'Non lus',  badge: unreadTotal },\n                  { key: 'archive', label: '🗄️ Archivés' },"
);

// Add mute / archive logic in menu
code = code.replace(
  "{ icon: Archive, label: 'Archiver conversation', action: () => toast('Bientôt') },",
  "{ icon: Archive, label: 'Archiver conversation', action: async () => {\n                    const { supabase } = await import('@/lib/supabase');\n                    await supabase.rpc('toggle_archive_conversation', { p_conv_id: conv.id, p_user_id: user?.id });\n                    toast.success('Conversation archivée');\n                  } },"
);

// Replace Notifications logic
code = code.replace(
  "{ icon: Bell,    label: 'Notifications',       action: () => toast('Bientôt') },",
  "{ icon: Bell,    label: 'Notifications (Mute)', action: async () => {\n                    const { supabase } = await import('@/lib/supabase');\n                    await supabase.rpc('toggle_mute_conversation', { p_conv_id: conv.id, p_user_id: user?.id });\n                    toast.success('Notifications modifiées');\n                  } },"
);

// Replace Favorite message logic
code = code.replace(
  "{ icon: Star,    label: 'Messages favoris',    action: () => toast('Bientôt') },",
  "{ icon: Star,    label: 'Messages favoris',    action: () => { window.alert('Pour marquer un message en favori, appuyez longuement dessus !') } },"
);

fs.writeFileSync('src/pages/MessagesPage.jsx', code, 'utf8');
