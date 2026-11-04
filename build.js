// EQ-Worker · 构建脚本（零依赖 ES Module）
// 将 _app_dev.js + index.template.html → index.html + EQ-Worker.html
import { readFile, writeFile, copyFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;

/* 版本单一来源：package.json。
   历史上 BRAND.version 与模板里的 <span class="ver"> 各自硬编码，曾漂移成 v3.1.0（package 已是 3.2.0）。
   这里统一从 package.json 读取并注入，源码里只保留占位符 __APP_VERSION__。 */
async function readVersion() {
  const pkg = JSON.parse(await readFile(resolve(ROOT, 'package.json'), 'utf8'));
  if (!/^\d+\.\d+\.\d+$/.test(pkg.version)) {
    throw new Error(`package.json 的 version 不是合法语义化版本：${pkg.version}`);
  }
  return pkg.version;
}

async function build() {
  const t0 = Date.now();
  const version = await readVersion();
  const versionTag = 'v' + version;

  // 1. 读取应用 JS，并把版本占位符替换成 package.json 的真实版本
  let appJs = await readFile(resolve(ROOT, '_app_dev.js'), 'utf8');
  if (!appJs.includes('__APP_VERSION__')) {
    throw new Error('_app_dev.js 中未找到 __APP_VERSION__ 占位符（BRAND.version 必须由构建注入）');
  }
  appJs = appJs.replaceAll('__APP_VERSION__', versionTag);

  // 2. 读取模板，并替换模板内的版本占位符
  let template = await readFile(resolve(ROOT, 'index.template.html'), 'utf8');
  if (!template.includes('__APP_VERSION__')) {
    throw new Error('index.template.html 中未找到 __APP_VERSION__ 占位符');
  }
  template = template.replaceAll('__APP_VERSION__', versionTag);

  // 3. 将 JS 内容替换占位符
  if (!template.includes('/*__APP_JS__*/')) {
    throw new Error('模板中未找到 /*__APP_JS__*/ 占位符');
  }
  // 3.1 内联 html2canvas（年报导出图片，离线可用，不再依赖外网 CDN）
  let h2c = '';
  let html0 = template;
  try {
    h2c = await readFile(resolve(ROOT, 'vendor/html2canvas.min.js'), 'utf8');
  } catch (_e) {
    console.warn('[build] 未找到 vendor/html2canvas.min.js，年报导出将退回 CDN 方案');
  }
  if (template.includes('/*__HTML2CANVAS__*/')) {
    html0 = template.replace('/*__HTML2CANVAS__*/', () => h2c);
  }
  const html = html0.replace('/*__APP_JS__*/', () => appJs);

  // 4. 写 index.html
  const indexPath = resolve(ROOT, 'index.html');
  await writeFile(indexPath, html, 'utf8');

  // 5. 复制为 EQ-Worker.html
  const cnPath = resolve(ROOT, 'EQ-Worker.html');
  await copyFile(indexPath, cnPath);

  /* 5.5 同步到原生端产物（关键！）
     Android APK 与 Windows 桌面版各自内嵌一份 index.html / sw.js / sw-register.js。
     以前这一步靠手工复制，只要忘了同步，APK 和 EXE 就会静默停留在旧逻辑上
     （本次体检就实际发生了：两端产物比 index.html 旧，不含新修复）。
     这里改为构建时强制同步，并在结尾校验一致性。 */
  const SYNC_FILES = ['index.html', 'sw.js', 'sw-register.js'];
  const SYNC_TARGETS = [
    resolve(ROOT, 'android/app/src/main/assets'),
    resolve(ROOT, 'desktop')
  ];
  const synced = [];
  for (const dir of SYNC_TARGETS) {
    try {
      await access(dir);               // 目录存在才同步，避免给无关目录凭空造文件
    } catch (_e) { continue; }
    for (const name of SYNC_FILES) {
      const src = resolve(ROOT, name);
      const dst = resolve(dir, name);
      await copyFile(src, dst);        // 目标文件可能不存在（如桌面 index.html 不入库），必须能补建
      synced.push(dir.replace(ROOT + '/', '') + '/' + name);
    }
  }

  // 6. 输出构建信息
  const dt = Date.now() - t0;
  const ts = new Date().toISOString();
  console.log(`[build] OK  index.html          ${html.length.toString().padStart(10)} bytes`);
  console.log(`[build] OK  EQ-Worker.html   ${html.length.toString().padStart(10)} bytes`);
  if (synced.length) console.log(`[build] OK  已同步原生端产物: ${synced.join(', ')}`);

  /* 6.5 一致性校验：任何一份产物与 index.html 不一致就报错退出，防止再次静默漂移 */
  const built = await readFile(indexPath, 'utf8');
  for (const dir of SYNC_TARGETS) {
    const p = resolve(dir, 'index.html');
    try {
      await access(p);
      const cur = await readFile(p, 'utf8');
      if (cur !== built) {
        console.error(`[build] FAILED: ${dir.replace(ROOT + '/', '')}/index.html 与最新构建不一致`);
        process.exit(1);
      }
    } catch (_e) { /* 不存在则跳过 */ }
  }
  console.log(`[build] done in ${dt}ms  @ ${ts}`);
}

build().catch(err => {
  console.error('[build] FAILED:', err.message);
  process.exit(1);
});
