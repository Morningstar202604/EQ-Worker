// 人情世故雷达 · 构建脚本（零依赖 ES Module）
// 将 _app_dev.js + index.template.html → index.html + 人情世故雷达.html
import { readFile, writeFile, copyFile } from 'node:fs/promises';
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

  // 5. 复制为 人情世故雷达.html
  const cnPath = resolve(ROOT, '人情世故雷达.html');
  await copyFile(indexPath, cnPath);

  // 6. 输出构建信息
  const dt = Date.now() - t0;
  const ts = new Date().toISOString();
  console.log(`[build] OK  index.html          ${html.length.toString().padStart(10)} bytes`);
  console.log(`[build] OK  人情世故雷达.html   ${html.length.toString().padStart(10)} bytes`);
  console.log(`[build] done in ${dt}ms  @ ${ts}`);
}

build().catch(err => {
  console.error('[build] FAILED:', err.message);
  process.exit(1);
});
