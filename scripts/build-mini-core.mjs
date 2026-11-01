// EQ-Worker · 小程序 core 构建脚本
// 把 packages/core/src 的 TypeScript 源码打包成小程序可直接 require 的 CommonJS 单文件。
// 约束：platform neutral、target es2019、不引入 node 内置模块、不依赖 process / fs。
import { mkdir, stat, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const ENTRY = resolve(ROOT, 'packages/core/src/index.ts');
const OUT_FILE = resolve(ROOT, 'EQ-Worker-小程序/utils/core.bundle.js');

/** esbuild 不是根 package 的直接依赖（由 Vite 传递安装），先按常规解析，再借 Vite 的解析器定位。 */
function loadEsbuild() {
  const require = createRequire(import.meta.url);
  try {
    return require('esbuild');
  } catch {
    const viteRequire = createRequire(require.resolve('vite/package.json'));
    return viteRequire('esbuild');
  }
}

async function build() {
  const t0 = Date.now();
  const esbuild = loadEsbuild();

  await mkdir(dirname(OUT_FILE), { recursive: true });

  const result = await esbuild.build({
    entryPoints: [ENTRY],
    outfile: OUT_FILE,
    bundle: true,
    format: 'cjs',
    platform: 'neutral',
    target: 'es2019',
    minify: false,
    treeShaking: true,
    legalComments: 'none',
    logLevel: 'silent',
    banner: {
      js: [
        '// EQ-Worker 小程序 core 生成文件，勿手改；源在 packages/core。',
        '// 重新生成：node scripts/build-mini-core.mjs',
        `// esbuild ${esbuild.version} · target es2019 · format cjs · platform neutral`
      ].join('\n')
    }
  });

  if (result.warnings.length) {
    for (const w of result.warnings) console.warn('[build:mini-core] warn:', w.text);
  }

  const info = await stat(OUT_FILE);
  const code = await readFile(OUT_FILE, 'utf8');
  if (/\brequire\(['"](?:node:)?(?:fs|path|process|os|child_process)['"]\)/.test(code)) {
    throw new Error('bundle 引用了 node 内置模块，小程序无法运行');
  }
  if (/\bprocess\.(?:env|argv|platform)\b/.test(code)) {
    throw new Error('bundle 依赖 process，小程序无法运行');
  }

  console.log(`[build:mini-core] OK  ${OUT_FILE}`);
  console.log(`[build:mini-core]     ${info.size.toString().padStart(8)} bytes  ${Date.now() - t0}ms`);
}

build().catch((err) => {
  console.error('[build:mini-core] FAILED:', err.message);
  process.exit(1);
});
