/**
 * 从 1024×1024 PNG 生成 Windows .ico。
 *
 * 用 PNG-in-ICO（Vista+ 支持的格式）而不是老式 BMP-in-ICO：
 * 不需要引入图像处理库，直接把缩放后的 PNG 塞进去即可。
 * 缩放用 sharp 会引入原生依赖，这里改为只放原尺寸 + 让系统缩放——
 * Windows 对超大 ICO 条目会自行降采样，视觉上没有损失。
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

/* 源图标优先用仓库内已跟踪的 desktop/icon.png。
   brand/dist/ 是 gen-assets.py 的生成产物、不入库，CI 全新检出时不存在，
   直接指向它会让打包 job 在干净环境下 500。 */
const candidates = [process.argv[2], 'desktop/icon.png', 'brand/dist/generic/icon-1024.png'];
const src = candidates.find((p) => p && existsSync(p));
if (!src) {
  console.error('[ico] 找不到源图标：desktop/icon.png 与 brand/dist/generic/icon-1024.png 都不存在');
  process.exit(1);
}
const out = process.argv[3] ?? 'desktop/icon.ico';
const png = readFileSync(src);

// PNG 头里读宽高
const width = png.readUInt32BE(16);
const height = png.readUInt32BE(20);

const HEADER = 6;
const ENTRY = 16;
const buf = Buffer.alloc(HEADER + ENTRY + png.length);

// ICONDIR
buf.writeUInt16LE(0, 0);        // reserved
buf.writeUInt16LE(1, 2);        // type: 1 = icon
buf.writeUInt16LE(1, 4);        // count

// ICONDIRENTRY — 256 及以上写 0
buf[6] = width >= 256 ? 0 : width;
buf[7] = height >= 256 ? 0 : height;
buf[8] = 0;                      // color palette
buf[9] = 0;                      // reserved
buf.writeUInt16LE(1, 10);        // color planes
buf.writeUInt16LE(32, 12);       // bits per pixel
buf.writeUInt32LE(png.length, 14);
buf.writeUInt32LE(HEADER + ENTRY, 18);

png.copy(buf, HEADER + ENTRY);
writeFileSync(out, buf);
console.log(`[ico] ${out}  ${width}x${height}  ${buf.length} bytes`);
