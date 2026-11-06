// EQ-Worker · 开放 SDK 构建脚本
// 把 packages/core 打包成两种可直接引用的产物：
//   dist-sdk/eq-worker-sdk.mjs  —— ESM，给浏览器 / 现代 Node / 打包器用
//   dist-sdk/eq-worker-sdk.cjs  —— CommonJS，给旧 Node / 脚本用
// 同时生成 .d.ts，让 TypeScript 使用者有类型提示。
//
// 约束：
// - 零运行时依赖（core 本身无外部依赖）。
// - 不引用 node 内置模块，保证浏览器可用。
// - 产物里带版本号，便于使用方排查。
import { mkdir, stat, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const ENTRY = resolve(ROOT, 'packages/core/src/index.ts');
const OUT_DIR = resolve(ROOT, 'dist-sdk');

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
  const pkg = JSON.parse(await readFile(resolve(ROOT, 'package.json'), 'utf8'));
  await mkdir(OUT_DIR, { recursive: true });

  const banner = [
    `// EQ-Worker SDK v${pkg.version} · 生成文件，勿手改`,
    '// 源码：packages/core/src · 重新生成：node scripts/build-sdk.mjs',
    '// 许可：CC BY-NC 4.0（个人与学习免费，商用需授权）'
  ].join('\n');

  const common = {
    entryPoints: [ENTRY],
    bundle: true,
    platform: 'neutral',
    target: 'es2020',
    minify: false,
    treeShaking: true,
    legalComments: 'none',
    logLevel: 'silent',
    banner: { js: banner }
  };

  const esmOut = resolve(OUT_DIR, 'eq-worker-sdk.mjs');
  const cjsOut = resolve(OUT_DIR, 'eq-worker-sdk.cjs');

  const esm = await esbuild.build({ ...common, outfile: esmOut, format: 'esm' });
  const cjs = await esbuild.build({ ...common, outfile: cjsOut, format: 'cjs' });

  for (const warnings of [esm.warnings, cjs.warnings]) {
    for (const w of warnings) console.warn('[build-sdk] warn:', w.text);
  }

  /* 类型声明：交给 tsc 生成到同一目录。
     这里只写一个 re-export 入口，具体声明由 tsconfig.sdk.json 产出。 */
  await writeFile(
    resolve(OUT_DIR, 'index.d.ts'),
    `// EQ-Worker SDK v${pkg.version} 类型入口
export * from './types/index';
`,
    'utf8'
  );

  /* 自检：产物不得引用 node 内置模块，否则浏览器用不了。 */
  for (const [label, file] of [['esm', esmOut], ['cjs', cjsOut]]) {
    const code = await readFile(file, 'utf8');
    if (/\brequire\(["'](?:node:)?(?:fs|path|os|child_process)["']\)/.test(code)) {
      throw new Error(`${label} 产物引用了 node 内置模块，浏览器不可用`);
    }
  }

  /* 导出清单：让使用者一眼看到有哪些能力，不用翻源码。 */
  const esmCode = await readFile(esmOut, 'utf8');
  const exported = [...esmCode.matchAll(/^export\s+\{([^}]+)\}/gm)]
    .flatMap((m) => m[1].split(',').map((s) => s.trim().split(/\s+as\s+/).pop()))
    .filter(Boolean);

  const esmInfo = await stat(esmOut);
  const cjsInfo = await stat(cjsOut);
  await writeFile(
    resolve(OUT_DIR, 'EXPORTS.md'),
    [
      `# EQ-Worker SDK v${pkg.version} 导出清单`,
      '',
      `共 ${exported.length} 个导出。`,
      '',
      ...exported.sort().map((n) => `- \`${n}\``),
      ''
    ].join('\n'),
    'utf8'
  );

  console.log(`[build-sdk] OK  ${esmOut}  ${esmInfo.size} bytes`);
  console.log(`[build-sdk] OK  ${cjsOut}  ${cjsInfo.size} bytes`);
  console.log(`[build-sdk]     导出 ${exported.length} 项，${Date.now() - t0}ms`);
}

build().catch((err) => {
  console.error('[build-sdk] FAILED:', err.message);
  process.exit(1);
});
