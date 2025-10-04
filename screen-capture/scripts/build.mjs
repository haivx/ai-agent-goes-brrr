import fsExtra from 'fs-extra';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const { copy, copyFile, emptyDir, ensureDir, writeFile } = fsExtra;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');
const distDir = resolve(rootDir, 'dist');
const iconPath = resolve(distDir, 'public', 'icon-128.png');
const iconBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAABY0lEQVR4nO3UQRGAQBADwYNCH4LwhQPk4AFk7GO6FeQxlW1d37fqzukBc/bpAcwSQJwA4gQQJ4A4AcQJIE4AcQKIE0CcAOIEECeAOAHECSBOAHECiBNAnADiBBAngDgBxAkgTgBxAogTQJwA4gQQJ4A4AcQJIE4AcQKIE0CcAOIEECeAOAHECSBOAHHHWvf0hnnvM71gjAeIE0CcAOIEECeAOAHECSBOAHECiBNAnADiBBAngDgBxAkgTgBxAogTQJwA4gQQJ4A4AcQJIE4AcQKIE0CcAOIEECeAOAHECSBOAHECiBNAnADiBBAngDgBxAkgTgBxAogTQJwA4gQQJ4A4AcQJIE4AcQKIE0CcAOIEECeAOAHECSBOAHECiBNAnADiBBAngDgBxP0a/wYtkK0lNgAAAABJRU5ErkJggg==';

const backgroundEntry = resolve(rootDir, 'src/background.ts');
const contentEntry = resolve(rootDir, 'src/content.ts');

for (const input of [backgroundEntry, contentEntry]) {
  if (!existsSync(input)) {
    throw new Error(`Missing entry point: ${input}`);
  }
}

await emptyDir(distDir);

await build({
  entryPoints: [backgroundEntry],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  outfile: resolve(distDir, 'background.js'),
  target: 'es2020',
  logLevel: 'info',
  sourcemap: false,
  treeShaking: true,
});

await build({
  entryPoints: [contentEntry],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  globalName: 'cropExtContent',
  outfile: resolve(distDir, 'content.js'),
  target: 'es2020',
  logLevel: 'info',
  sourcemap: false,
  treeShaking: true,
});

await copyFile(resolve(rootDir, 'manifest.json'), resolve(distDir, 'manifest.json'));
await copy(resolve(rootDir, 'public'), resolve(distDir, 'public'), {
  filter: (source) => !source.endsWith('.gitkeep'),
});
await ensureDir(dirname(iconPath));
await writeFile(iconPath, Buffer.from(iconBase64, 'base64'));

console.log('Build completed successfully.');
