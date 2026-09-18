const fs = require('fs');
let code = fs.readFileSync('src/pages/SettingsPage.jsx', 'utf8');

// Remove the big TRANSLATIONS object (starts with "const TRANSLATIONS = {" and ends at the closing "}")
// We replace it with empty string since we now use i18next
const startMarker = 'const TRANSLATIONS = {';
const startIdx = code.indexOf(startMarker);
if (startIdx === -1) { console.log('TRANSLATIONS not found'); process.exit(0); }

// Find the matching closing brace
let depth = 0;
let endIdx = startIdx;
for (let i = startIdx; i < code.length; i++) {
  if (code[i] === '{') depth++;
  if (code[i] === '}') { depth--; if (depth === 0) { endIdx = i + 1; break; } }
}

// Remove the block (with surrounding newlines)
const before = code.substring(0, startIdx);
const after = code.substring(endIdx);
code = before.trimEnd() + '\n' + after.trimStart();

// Also fix LanguageSheet: update the select() function
// The select() still uses profile?.language for current - that's fine
// But we also need to make sure i18n is imported in LanguageSheet or uses the one from parent
// LanguageSheet already has i18n.changeLanguage - this should work now

// Fix: ensure i18n is not declared twice in SettingsPage component
code = code.replace('    const { t, i18n } = useTranslation()\n    const lang = i18n.language', '    const { t } = useTranslation()');

fs.writeFileSync('src/pages/SettingsPage.jsx', code, 'utf8');
console.log('DONE - TRANSLATIONS removed, useTranslation used');
console.log('Start index:', startIdx, 'End index:', endIdx);
