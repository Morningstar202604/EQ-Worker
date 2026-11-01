import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

const smokeRoot = fileURLToPath(new URL('./src/smoke/', import.meta.url));
const smokeOutput = fileURLToPath(new URL('./dist-vite/', import.meta.url));

export default defineConfig({
  root: smokeRoot,
  base: './',
  build: {
    outDir: smokeOutput,
    emptyOutDir: true
  }
});
