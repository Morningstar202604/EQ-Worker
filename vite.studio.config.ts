import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

const studioRoot = fileURLToPath(new URL('./apps/studio/', import.meta.url));
const studioOutput = fileURLToPath(new URL('./dist-studio/', import.meta.url));

export default defineConfig({
  root: studioRoot,
  base: './',
  build: {
    outDir: studioOutput,
    emptyOutDir: true
  }
});
