// EQ-Worker · 构建脚本（零依赖 ES Module）
// 将 _app_dev.js + index.template.html → index.html + EQ-Worker.html
import { readFile, writeFile, copyFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;

async function build() {
  const t0 = Date.now();

  // 1. 读取应用 JS
  const appJs = await readFile(resolve(ROOT, '_app_dev.js'), 'utf8');

  // 2. 读取模板
  const template = await readFile(resolve(ROOT, 'index.template.html'), 'utf8');

  // 3. 将 JS 内容替换占位符
  if (!template.includes('/*__APP_JS__*/')) {
    throw new Error('模板中未找到 /*__APP_JS__*/ 占位符');
  }
  // 3.1 内联 html2canvas（年报导出图片，离线可用，不再依赖外网 CDN）
  let h2c = '';
  let html0 = template;
  try {
    h2c = await readFile(resolve(ROOT, 'vendor/html2canvas.min.js'), 'utf8');
  } catch (e) {
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
    for (const name of SYNC_FILES) {
      const src = resolve(ROOT, name);
      const dst = resolve(dir, name);
      try {
        await access(dst);              // 目标已存在才同步，避免给无关目录凭空造文件
        await copyFile(src, dst);
        synced.push(dir.replace(ROOT + '/', '') + '/' + name);
      } catch (e) { /* 目标不存在则跳过 */ }
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
    } catch (e) { /* 不存在则跳过 */ }
  }
  console.log(`[build] done in ${dt}ms  @ ${ts}`);
}

build().catch(err => {
  console.error('[build] FAILED:', err.message);
  process.exit(1);
});
