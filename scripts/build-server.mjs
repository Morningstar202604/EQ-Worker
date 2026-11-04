import { build } from 'esbuild';
import { mkdirSync, cpSync } from 'node:fs';

mkdirSync('dist-server', { recursive: true });
await build({
  entryPoints: ['apps/server/src/server.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  outfile: 'dist-server/server.mjs',
  logLevel: 'info'
});
cpSync('apps/server/web', 'dist-server/web', { recursive: true });
console.log('[server] 已生成 dist-server/');
