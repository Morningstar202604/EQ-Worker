import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';

mkdirSync('dist-mcp', { recursive: true });
await build({
  entryPoints: ['apps/mcp/src/server.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  outfile: 'dist-mcp/eq-worker-mcp.mjs',
  // MCP SDK 有动态 import，保留为外部依赖避免打包问题
  external: ['@modelcontextprotocol/sdk', 'zod'],
  logLevel: 'info'
});
console.log('[mcp] 已生成 dist-mcp/eq-worker-mcp.mjs');
