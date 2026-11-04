/**
 * 把 apps/cli/src/cli.ts 打成单文件 ESM，供 `node dist-cli/eqw.mjs` 直接运行。
 * 用 esbuild（Vite 自带依赖），避免为一个 CLI 引入新的打包链。
 */
import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';

mkdirSync('dist-cli', { recursive: true });
await build({
  entryPoints: ['apps/cli/src/cli.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  outfile: 'dist-cli/eqw.mjs',

  logLevel: 'info'
});
console.log('[cli] 已生成 dist-cli/eqw.mjs');
