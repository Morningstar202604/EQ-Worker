#!/usr/bin/env node
/**
 * 跨 Node 版本的测试入口。
 *
 * 为什么需要它：`node --test "tests/**\/*.test.mjs"` 的通配符展开只在 Node 22.6+
 * 支持。CI 跑 Node 20 时该参数被当成字面路径，直接报
 * "Could not find '.../tests/**\/*.test.mjs'"，整条流水线红掉。
 *
 * 这里显式枚举文件再交给 node --test，Node 18/20/22/24 与 cmd/bash 下行为一致。
 * `--exclude-e2e` 供 CI 的单元测试 job 使用：E2E 需要 Playwright 浏览器与
 * dist-studio 构建产物，由独立的 e2e job 负责。
 */
import { readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(import.meta.dirname, '..');
const TESTS_DIR = join(ROOT, 'tests');
const excludeE2E = process.argv.includes('--exclude-e2e');

function collect(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collect(full));
    else if (entry.name.endsWith('.test.mjs')) out.push(full);
  }
  return out;
}

const files = collect(TESTS_DIR)
  .filter((f) => !(excludeE2E && f.endsWith('e2e.test.mjs')))
  .sort();

if (files.length === 0) {
  console.error('[test] 没有找到任何测试文件');
  process.exit(1);
}

const rel = files.map((f) => relative(ROOT, f));
console.log(`[test] ${rel.length} 个测试文件${excludeE2E ? '（已排除 E2E）' : ''}`);

const result = spawnSync(process.execPath, ['--test', ...rel], {
  cwd: ROOT,
  stdio: 'inherit'
});

process.exit(result.status ?? 1);
