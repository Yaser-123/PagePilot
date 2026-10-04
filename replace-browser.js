import fs from 'fs';

let content = fs.readFileSync('src/sidebar/sidebar.tsx', 'utf8');

// Remove import browser from 'webextension-polyfill'
content = content.replace(/import browser from 'webextension-polyfill';\n/g, '');

// Replace browser. with chrome.
content = content.replace(/browser\./g, 'chrome.');

fs.writeFileSync('src/sidebar/sidebar.tsx', content);
console.log('Replaced browser with chrome in sidebar.tsx');
