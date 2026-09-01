const fs = require('fs');
let code = fs.readFileSync('src/pages/MessagesPage.jsx', 'utf8');

// Find the text render block inside MessageBubble
const oldText = "{msg.type === 'text' && (\n              <p className=\"text-sm leading-relaxed break-words whitespace-pre-wrap\">{msg.content}</p>\n            )}";
const oldTextW = "{msg.type === 'text' && (\r\n              <p className=\"text-sm leading-relaxed break-words whitespace-pre-wrap\">{msg.content}</p>\r\n            )}";

const newText = "{msg.type === 'text' && (\n              <div className=\"flex flex-col\">\n                <p className=\"text-sm leading-relaxed break-words whitespace-pre-wrap\">{msg.content}</p>\n                {(msg.favorited_by || []).includes(userId) && (\n                  <span className=\"self-end mt-1\"><Star size={12} fill=\"currentColor\" className=\"text-yellow-400\" /></span>\n                )}\n              </div>\n            )}";

if (code.includes(oldText)) code = code.replace(oldText, newText);
else if (code.includes(oldTextW)) code = code.replace(oldTextW, newText);

fs.writeFileSync('src/pages/MessagesPage.jsx', code, 'utf8');
