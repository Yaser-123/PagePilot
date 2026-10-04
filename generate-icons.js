import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const svg = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#888888"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="128" fill="#111111" />
  <path d="M120 256 L392 120 L256 392 L220 292 Z" fill="url(#grad)" stroke="#ffffff" stroke-width="8" stroke-linejoin="round"/>
</svg>
`;

const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const sizes = [16, 32, 48, 128];

async function generate() {
  for (const size of sizes) {
    await sharp(Buffer.from(svg))
      .resize(size, size)
      .png()
      .toFile(path.join(publicDir, `icon${size}.png`));
    console.log(`Generated icon${size}.png`);
  }
}

generate().catch(console.error);
