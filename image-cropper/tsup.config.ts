import { defineConfig } from 'tsup';
import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const distDir = path.resolve(projectRoot, 'dist');
const staticFiles = ['manifest.json', 'popup.html', 'styles.css'];

const copyStaticAssets = async (): Promise<void> => {
  await mkdir(distDir, { recursive: true });

  await Promise.all(
    staticFiles.map((file) =>
      copyFile(path.resolve(projectRoot, 'src', file), path.resolve(distDir, file))
    )
  );
};

export default defineConfig(({ watch }) => ({
  entry: ['src/popup.ts'],
  format: ['esm'],
  sourcemap: true,
  clean: true,
  target: 'es2020',
  outDir: 'dist',
  splitting: false,
  minify: !watch,
  treeshake: true,
  esbuildPlugins: [
    {
      name: 'copy-static-assets',
      setup(build) {
        build.onEnd(async (result) => {
          if (result.errors.length === 0) {
            await copyStaticAssets();
          }
        });
      }
    }
  ]
}));
