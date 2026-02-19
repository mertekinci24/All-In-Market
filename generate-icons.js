import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const iconDir = path.join(__dirname, 'extension', 'icons');

if (!fs.existsSync(iconDir)) {
    fs.mkdirSync(iconDir, { recursive: true });
}

// 1x1 pixel transparent PNG (base64)
const png1x1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

['16', '48', '128'].forEach(size => {
    fs.writeFileSync(path.join(iconDir, `icon-${size}.png`), png1x1);
    console.log(`Created icon-${size}.png`);
});

console.log('Icons created successfully.');
