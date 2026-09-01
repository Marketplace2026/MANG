const fs = require('fs');
let code = fs.readFileSync('src/pages/MessagesPage.jsx', 'utf8');

// Replace tabs definition
const oldTabs = "{ key: 'vente',  label: '💼 Vente', badge: unreadVente },\n                  { key: 'unread', label: 'Non lus',  badge: unreadTotal },";
const oldTabsWindows = "{ key: 'vente',  label: '💼 Vente', badge: unreadVente },\r\n                  { key: 'unread', label: 'Non lus',  badge: unreadTotal },";
const newTabs = "{ key: 'vente',  label: '💼 Vente', badge: unreadVente },\n                  { key: 'unread', label: 'Non lus',  badge: unreadTotal },\n                  { key: 'archive', label: '🗄️ Archivés' },";

if (code.includes(oldTabs)) code = code.replace(oldTabs, newTabs);
else if (code.includes(oldTabsWindows)) code = code.replace(oldTabsWindows, newTabs.replace(/\n/g, '\r\n'));

// Replace filtered logic for convs
const oldFilter = const matchSearch = !q || (other?.username || '').toLowerCase().includes(q) || (c.shop?.name || '').toLowerCase().includes(q) || (c.last_message || '').toLowerCase().includes(q)
      // Achat = l'utilisateur est le buyer (il a initié la conv)
      // Vente = l'utilisateur est le seller (l'autre a initié)
      const matchTab =
        tab === 'all' ? true :
        tab === 'unread' ? (c.unread_count || 0) > 0 :
        tab === 'achat' ? c.buyer_id === user?.id :
        tab === 'vente' ? c.seller_id === user?.id : true

      return matchSearch && matchTab;

const newFilter = const matchSearch = !q || (other?.username || '').toLowerCase().includes(q) || (c.shop?.name || '').toLowerCase().includes(q) || (c.last_message || '').toLowerCase().includes(q)
      
      const isArchived = Array.isArray(c.archived_by) && c.archived_by.includes(user?.id);
      if (tab === 'archive') return matchSearch && isArchived;
      if (isArchived) return false;

      // Achat = l'utilisateur est le buyer (il a initié la conv)
      // Vente = l'utilisateur est le seller (l'autre a initié)
      const matchTab =
        tab === 'all' ? true :
        tab === 'unread' ? (c.unread_count || 0) > 0 :
        tab === 'achat' ? c.buyer_id === user?.id :
        tab === 'vente' ? c.seller_id === user?.id : true

      return matchSearch && matchTab;

if (code.includes(oldFilter)) {
  code = code.replace(oldFilter, newFilter);
} else {
  const oldW = oldFilter.replace(/\n/g, '\r\n');
  if (code.includes(oldW)) {
    code = code.replace(oldW, newFilter.replace(/\n/g, '\r\n'));
  }
}

fs.writeFileSync('src/pages/MessagesPage.jsx', code, 'utf8');
console.log("Done");
