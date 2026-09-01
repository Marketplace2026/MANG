const fs = require('fs');
let code = fs.readFileSync('src/pages/MessagesPage.jsx', 'utf8');

// 1. Update MessageBubble definition to take onFavorite and userId
const oldBubbleDef = 'function MessageBubble({ msg, isMe, onLongPress, onReact, reactions, onDelete, onReply, onCopy, onZoom, replyMsg }) {';
const newBubbleDef = 'function MessageBubble({ msg, isMe, onLongPress, onReact, reactions, onDelete, onReply, onCopy, onZoom, replyMsg, onFavorite, userId }) {';
code = code.replace(oldBubbleDef, newBubbleDef);

// 2. Update the 'Mettre en favori' action
const oldStarAction = "{ icon: Star,    label: msg.is_starred ? 'Retirer favori' : 'Mettre en favori', action: () => setMenuOpen(false) },";
const newStarAction = "{ icon: Star,    label: (msg.favorited_by || []).includes(userId) ? 'Retirer favori' : 'Mettre en favori', action: () => { if(onFavorite) onFavorite(); setMenuOpen(false) } },";
code = code.replace(oldStarAction, newStarAction);

// 3. Update the place where MessageBubble is rendered
const oldRender = "<MessageBubble key={m.id} msg={m} isMe={m.sender_id === user?.id}";
const newRender = "<MessageBubble key={m.id} msg={m} isMe={m.sender_id === user?.id} userId={user?.id}\n                    onFavorite={async () => {\n                      const { supabase } = await import('@/lib/supabase');\n                      await supabase.rpc('toggle_favorite_message', { p_message_id: m.id, p_user_id: user?.id });\n                      toast.success('Favori modifié');\n                    }}";
code = code.replace(oldRender, newRender);

// 4. In the Chat Info menu (Messages favoris), instead of alerting, set state to filter favorites
// Wait, is there a state for showFavorites? We need to add one.
// Let's find "const [showSearch, setShowSearch] = useState(false)"
const oldShowSearch = "const [showSearch, setShowSearch] = useState(false)";
const newShowSearch = "const [showSearch, setShowSearch] = useState(false)\n  const [showFavorites, setShowFavorites] = useState(false)";
code = code.replace(oldShowSearch, newShowSearch);

// Now update the action for "Messages favoris" in Chat Info
const oldFavMenu = "{ icon: Star,    label: 'Messages favoris',    action: () => { window.alert('Pour marquer un message en favori, appuyez longuement dessus !') } },";
const newFavMenu = "{ icon: Star,    label: showFavorites ? 'Afficher tous les messages' : 'Messages favoris',    action: () => { setShowFavorites(!showFavorites); setShowInfo(false) } },";
code = code.replace(oldFavMenu, newFavMenu);

// Update const filtered = searchMsg to respect showFavorites
const oldMsgFilter = "const filtered = searchMsg\n      ? messages.filter(m => m.content?.toLowerCase().includes(searchMsg.toLowerCase()))\n      : messages";
const oldMsgFilterW = "const filtered = searchMsg\r\n      ? messages.filter(m => m.content?.toLowerCase().includes(searchMsg.toLowerCase()))\r\n      : messages";
const newMsgFilter = "const filtered = showFavorites ? messages.filter(m => (m.favorited_by || []).includes(user?.id)) : searchMsg ? messages.filter(m => m.content?.toLowerCase().includes(searchMsg.toLowerCase())) : messages";
if (code.includes(oldMsgFilter)) code = code.replace(oldMsgFilter, newMsgFilter);
else if (code.includes(oldMsgFilterW)) code = code.replace(oldMsgFilterW, newMsgFilter);

fs.writeFileSync('src/pages/MessagesPage.jsx', code, 'utf8');
