import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { zip } from 'zip-a-folder';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');
const distDir = resolve(rootDir, 'dist');
const outputZip = resolve(rootDir, 'chrome-image-cropper.zip');

if (!existsSync(distDir)) {
  throw new Error('dist/ directory not found. Run "pnpm build" first.');
}

await zip(distDir, outputZip);

console.log(`Created ${outputZip}`);
