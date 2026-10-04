import fs from 'fs';

let content = fs.readFileSync('src/sidebar/sidebar.tsx', 'utf8');

// Replace "New Chat" button gradient
content = content.replace(
  /bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg transition-all font-medium cursor-pointer shadow-lg shadow-indigo-500\/25 border border-white\/10/g,
  'bg-white hover:bg-slate-200 text-black rounded-lg transition-all font-bold cursor-pointer shadow-[0_0_15px_rgba(255,255,255,0.1)] active:scale-[0.98]'
);

// Replace active conversation item
content = content.replace(
  /bg-indigo-500\/15 text-indigo-300 border border-indigo-500\/20/g,
  'bg-white/10 text-white border border-white/20 shadow-inner'
);

// Replace logo background
content = content.replace(
  /bg-gradient-to-br from-blue-600 to-indigo-600/g,
  'bg-white text-black'
);
content = content.replace(
  /shadow-indigo-500\/30/g,
  'shadow-[0_0_15px_rgba(255,255,255,0.15)]'
);

// Replace empty state SVG
content = content.replace(
  /text-indigo-400/g,
  'text-white/40'
);

// Replace user bubble gradient
content = content.replace(
  /bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-br-sm shadow-indigo-500\/20/g,
  'bg-[#1a1a1a] border border-white/10 text-white rounded-br-sm shadow-sm'
);

// Replace markdown colors
content = content.replace(/marker:text-indigo-400/g, 'marker:text-slate-400');
content = content.replace(/text-indigo-300/g, 'text-slate-200');
content = content.replace(/text-indigo-200/g, 'text-white');
content = content.replace(/border-indigo-500\/50/g, 'border-white/30');

// Link replacements
content = content.replace(/bg-indigo-500 border-indigo-400 text-white shadow-\[0_0_10px_rgba\(99,102,241,0.5\)\]/g, 'bg-white text-black shadow-[0_0_10px_rgba(255,255,255,0.3)] active:scale-95');
content = content.replace(/decoration-indigo-400\/30/g, 'decoration-white/30');
content = content.replace(/bg-indigo-400/g, 'bg-white');

// Input focus rings
content = content.replace(/focus-within:border-indigo-500\/50 focus-within:ring-2 focus-within:ring-indigo-500\/20/g, 'focus-within:border-white/30 focus-within:ring-2 focus-within:ring-white/10');

// Send button gradient
content = content.replace(
  /bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white flex items-center justify-center transition-all shadow-\[0_0_15px_rgba\(99,102,241,0.4\)\] hover:shadow-\[0_0_25px_rgba\(99,102,241,0.6\)\]/g,
  'bg-white hover:bg-slate-200 disabled:bg-[#111] disabled:text-slate-600 text-black flex items-center justify-center transition-all shadow-[0_0_15px_rgba(255,255,255,0.2)] hover:shadow-[0_0_25px_rgba(255,255,255,0.4)] active:scale-95'
);

fs.writeFileSync('src/sidebar/sidebar.tsx', content);
console.log('Replacements complete');
