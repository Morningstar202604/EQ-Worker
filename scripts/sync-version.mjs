#!/usr/bin/env node
// EQ-Worker · 版本单一来源同步器
//
// 问题：版本号曾分散在 6 个地方手工维护，实际已漂移过（BRAND.version 停在 v3.1.0，
// 而 package.json 已是 3.2.0）。手工同步不可靠，所以把 package.json 定为唯一来源，
// 其余位置全部由本脚本派生或校验。
//
// 用法：
//   node scripts/sync-version.mjs           # 校验（CI / verify 用），不一致则 exit 1
//   node scripts/sync-version.mjs --write   # 写入（发版时用）
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const WRITE = process.argv.includes('--write');

const pkg = JSON.parse(await readFile(resolve(ROOT, 'package.json'), 'utf8'));
const VERSION = pkg.version;
if (!/^\d+\.\d+\.\d+$/.test(VERSION)) {
  console.error(`[version] package.json version 非法：${VERSION}`);
  process.exit(1);
}
const [major, minor, patch] = VERSION.split('.').map(Number);
// Android versionCode 规则（历史沿革核对：2.8.1->281、3.0.0->300、3.1.0->310）：
//   major*100 + minor*10 + patch。3.2.0 应为 320，仓库里曾误写成 312（笔误，已修正）。
// 该规则单调递增，320 > 312，已发布设备可正常覆盖升级。
const ANDROID_CODE = major * 100 + minor * 10 + patch;

/** 每项：file, 匹配正则（必须恰好命中一次）, 期望替换 */
const targets = [
  {
    file: 'android/app/build.gradle',
    pattern: /versionCode \d+/,
    expected: `versionCode ${ANDROID_CODE}`,
    label: 'Android versionCode'
  },
  {
    file: 'android/app/build.gradle',
    pattern: /versionName '[^']*'/,
    expected: `versionName '${VERSION}'`,
    label: 'Android versionName'
  },
  {
    file: 'desktop/package.json',
    pattern: /"version": "[^"]*"/,
    expected: `"version": "${VERSION}"`,
    label: 'desktop package.json'
  },
  {
    // package-lock.json 顶层 version 与 packages[""].version 两处，其余依赖版本不能动。
    file: 'desktop/package-lock.json',
    pattern: /^(\s*)"version": "[^"]*",$/m,
    expected: null, // 由 json 分支专门处理
    label: 'desktop package-lock.json',
    json: (lock) => {
      lock.version = VERSION;
      if (lock.packages && lock.packages['']) lock.packages[''].version = VERSION;
      return lock;
    }
  },
  {
    file: 'sw.js',
    pattern: /const CACHE_NAME = 'eqworker-v[\d.]+-r\d+';/,
    expected: `const CACHE_NAME = 'eqworker-v${VERSION}-r1';`,
    label: 'sw.js CACHE_NAME'
  },
  {
    file: 'desktop/sw.js',
    pattern: /const CACHE_NAME = 'eqworker-v[\d.]+-r\d+';/,
    expected: `const CACHE_NAME = 'eqworker-v${VERSION}-r1';`,
    label: 'desktop/sw.js CACHE_NAME'
  },
  {
    file: 'android/app/src/main/assets/sw.js',
    pattern: /const CACHE_NAME = 'eqworker-v[\d.]+-r\d+';/,
    expected: `const CACHE_NAME = 'eqworker-v${VERSION}-r1';`,
    label: 'android assets sw.js CACHE_NAME'
  },
  {
    file: 'EQ-Worker-小程序/pages/me/me.js',
    pattern: /version: 'v[\d.]+',/,
    expected: `version: 'v${VERSION}',`,
    label: '小程序 me.js version'
  }
];

const problems = [];
const writes = [];

for (const t of targets) {
  const path = resolve(ROOT, t.file);
  let text;
  try {
    text = await readFile(path, 'utf8');
  } catch {
    problems.push(`${t.label}: 文件不存在 ${t.file}`);
    continue;
  }

  // JSON 结构化分支：只改指定字段，绝不碰依赖版本
  if (t.json) {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      problems.push(`${t.label}: JSON 解析失败 ${e.message}`);
      continue;
    }
    const before = JSON.stringify(parsed);
    const updated = t.json(parsed);
    if (JSON.stringify(updated) !== before) {
      if (WRITE) {
        writes.push({ path, next: JSON.stringify(updated, null, 2) + '\n', label: t.label, from: before.length + 'B', to: VERSION });
      } else {
        problems.push(`${t.label}: 顶层 version 与 packages[""].version 应为 ${VERSION}`);
      }
    }
    continue;
  }

  const hits = text.match(new RegExp(t.pattern.source, t.pattern.flags.includes('g') ? t.pattern.flags : t.pattern.flags + 'g'));
  if (!hits || hits.length === 0) {
    problems.push(`${t.label}: 在 ${t.file} 中找不到匹配 ${t.pattern}`);
    continue;
  }
  const wrong = hits.filter((h) => h !== t.expected);
  if (wrong.length) {
    if (WRITE) {
      const next = text.replace(t.pattern, t.expected);
      writes.push({ path, next, label: t.label, from: wrong.join(', '), to: t.expected });
    } else {
      problems.push(`${t.label}: ${t.file} 为 ${wrong.join(', ')}，应为 ${t.expected}`);
    }
  }
}

// 缓存名版本与 package 版本一致性（防止只改了 version 忘了换缓存名）
if (!problems.length && !writes.length) {
  console.log(`[version] OK 全部产物版本一致：v${VERSION}（android versionCode ${ANDROID_CODE}）`);
  process.exit(0);
}

if (WRITE) {
  /* 同一文件可能有多个 target（如 build.gradle 的 versionCode 与 versionName）。
     每个 target 都基于原始文本生成 next，逐个写会互相覆盖——按文件合并后一次写入。 */
  const byPath = new Map();
  for (const w of writes) {
    const existing = byPath.get(w.path);
    if (!existing) {
      byPath.set(w.path, { ...w, labels: [w.label] });
      continue;
    }
    // 在已有 next 的基础上继续应用本 target 的替换
    const target = targets.find((t) => t.label === w.label);
    const merged = target && !target.json ? existing.next.replace(target.pattern, target.expected) : existing.next;
    byPath.set(w.path, { ...existing, next: merged, labels: [...existing.labels, w.label], from: `${existing.from}, ${w.from}` });
  }
  for (const w of byPath.values()) {
    await writeFile(w.path, w.next, 'utf8');
    console.log(`[version] 已更新 ${w.labels.join(' + ')}: ${w.from} -> ${w.to}`);
  }
  if (!writes.length) console.log('[version] 无需写入');
  if (problems.length) {
    console.error('[version] 仍有无法自动修复的问题：');
    problems.forEach((p) => console.error('  - ' + p));
    process.exit(1);
  }
  process.exit(0);
}

console.error('[version] 版本号不一致（运行 node scripts/sync-version.mjs --write 修复）：');
problems.forEach((p) => console.error('  - ' + p));
process.exit(1);
