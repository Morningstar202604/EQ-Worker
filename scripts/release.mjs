#!/usr/bin/env node
/**
 * 一键发布：构建全部产物 → 生成校验和 → 汇总发布清单。
 *
 * 设计要点：
 * - **不自动推送**。发布是外部副作用，必须先看清单再决定；脚本只准备文件。
 * - **校验和用 SHA-256**，与 GitHub Release / 运维校验的通行做法一致。
 * - **清单里写清「未验证项」**，避免把「构建成功」当成「已发布可用」。
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';

const ROOT = process.cwd();
const OUT = join(ROOT, 'release');
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const VERSION = pkg.version;

const steps = [];
function run(label, cmd, args, opts = {}) {
  process.stdout.write(`  → ${label}\n`);
  try {
    // 不用 shell：Windows 上 shell:true 会把带空格的 node 路径按空格拆断。
    // 直接调用可执行文件即可。
    execFileSync(cmd, args, { cwd: opts.cwd ?? ROOT, stdio: 'pipe' });
    steps.push({ label, ok: true });
  } catch (e) {
    steps.push({ label, ok: false, err: (e.stderr ?? e.message ?? '').toString().slice(0, 400) });
  }
}

function sha256(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

function size(file) {
  const b = statSync(file).size;
  return b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${(b / 1024).toFixed(0)} KB`;
}

console.log(`\nEQ-Worker 发布准备 v${VERSION}\n`);
console.log('1/4 构建产物');
run('版本一致性', process.execPath, ['scripts/sync-version.mjs']);
run('网页应用', process.execPath, ['build.js']);
run('小程序核心', process.execPath, ['scripts/build-mini-core.mjs']);
run('CLI', process.execPath, ['scripts/build-cli.mjs']);
run('本地后台', process.execPath, ['scripts/build-server.mjs']);
run('MCP 服务器', process.execPath, ['scripts/build-mcp.mjs']);
run('Studio', process.execPath, [join(ROOT, 'node_modules/vite/bin/vite.js'), 'build', '--config', 'vite.studio.config.ts']);

console.log('\n2/4 收集可分发文件');
mkdirSync(OUT, { recursive: true });

/** 需要随版本发布的文件。缺一个就在清单里标出来，不静默跳过。 */
const artifacts = [
  { name: '网页应用（单文件）', path: 'EQ-Worker.html' },
  { name: '网页入口', path: 'index.html' },
  { name: 'CLI（单文件 ESM）', path: 'dist-cli/eqw.mjs' },
  { name: '本地后台服务', path: 'dist-server/server.mjs' },
  { name: 'MCP 服务器', path: 'dist-mcp/eq-worker-mcp.mjs' },
  { name: '小程序核心包', path: 'EQ-Worker-小程序/utils/core.bundle.js' },
  { name: 'Android APK（release）', path: 'android/app/build/outputs/apk/release/app-release.apk' },
  { name: 'Android APK（debug）', path: 'android/app/build/outputs/apk/debug/app-debug.apk' }
];

// Windows 安装包按版本号找，避免写死文件名
const winDir = join(ROOT, 'desktop/dist');
if (existsSync(winDir)) {
  for (const f of readdirSync(winDir)) {
    if (f.endsWith('.exe') && f.includes(VERSION)) {
      artifacts.push({ name: 'Windows 安装包（NSIS）', path: `desktop/dist/${f}` });
    }
  }
}

const present = [];
const missing = [];
for (const a of artifacts) {
  const full = join(ROOT, a.path);
  if (existsSync(full)) present.push({ ...a, full, sha: sha256(full), size: size(full) });
  else missing.push(a);
}

if (missing.length) {
  console.log('  ⚠ 缺失：');
  for (const m of missing) console.log(`    - ${m.name}（${m.path}）`);
}

console.log('\n3/4 生成校验和');
const checksumLines = present.map((p) => `${p.sha}  ${basename(p.path)}`).join('\n');
writeFileSync(join(OUT, `SHA256SUMS-${VERSION}.txt`), checksumLines + '\n', 'utf8');
console.log(`  → release/SHA256SUMS-${VERSION}.txt（${present.length} 项）`);

console.log('\n4/4 生成发布清单');
const commit = (() => {
  try { return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(); }
  catch { return 'unknown'; }
})();
const date = new Date().toISOString().slice(0, 10);

const md = [];
md.push(`# EQ-Worker v${VERSION} 发布清单`);
md.push('');
md.push(`- 日期：${date}`);
md.push(`- 提交：\`${commit}\``);
md.push(`- 生成方式：\`node scripts/release.mjs\``);
md.push('');
md.push('## 产物');
md.push('');
md.push('| 产物 | 体积 | SHA-256（前 16 位） |');
md.push('| --- | --- | --- |');
for (const p of present) {
  md.push(`| ${p.name} | ${p.size} | \`${p.sha.slice(0, 16)}\` |`);
}
if (missing.length) {
  md.push('');
  md.push('## 缺失产物');
  md.push('');
  for (const m of missing) md.push(`- ${m.name}：\`${m.path}\``);
}
md.push('');
md.push('## 构建步骤');
md.push('');
for (const s of steps) md.push(`- ${s.ok ? '✅' : '❌'} ${s.label}${s.ok ? '' : ` — ${s.err}`}`);
md.push('');
md.push('## 发布前必须人工确认');
md.push('');
md.push('- [ ] 安装包在本机双击安装、启动、卸载各一次');
md.push('- [ ] Android APK 真机安装并走一遍主流程');
md.push('- [ ] 微信小程序在开发者工具中预览（真机另需备案与 AppID）');
md.push('- [ ] MCP 服务器在真实客户端（Claude Desktop / Cursor）里跑一次');
md.push('- [ ] APK 若用于正式分发，需配置 `android/keystore.properties` 重新签名');
md.push('');
md.push('## 已知未验证项');
md.push('');
md.push('- 小程序真机；安卓 APK 未用正式证书签名；');
md.push('- Windows 安装包未做代码签名（无证书），SmartScreen 会提示未知发布者；');
md.push('- MCP 仅用官方 SDK 客户端验证协议层，未在真实桌面客户端里端到端跑。');
md.push('');
md.push('> 这份清单是**构建结果**，不等于**已发布可用**。上面的人工确认项没勾完，不要对外宣称版本可用。');

writeFileSync(join(OUT, `RELEASE-${VERSION}.md`), md.join('\n') + '\n', 'utf8');
console.log(`  → release/RELEASE-${VERSION}.md`);

const failed = steps.filter((s) => !s.ok);
console.log('');
if (failed.length) {
  console.log(`❌ ${failed.length} 个构建步骤失败：`);
  for (const f of failed) console.log(`   - ${f.label}: ${f.err}`);
  process.exitCode = 1;
} else {
  console.log(`✅ 发布准备完成：${present.length} 个产物，${missing.length} 项缺失`);
  console.log(`   清单：release/RELEASE-${VERSION}.md`);
  console.log('   下一步：人工确认清单后，git tag -a v' + VERSION + ' 并推送。');
}
