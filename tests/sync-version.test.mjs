import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const gradle = path.join(repo, 'android/app/build.gradle');

function readGradle() {
  return fs.readFileSync(gradle, 'utf8');
}

function pkgVersion() {
  return JSON.parse(fs.readFileSync(path.join(repo, 'package.json'), 'utf8')).version;
}

test('版本校验脚本在产物一致时通过', () => {
  // 只跑校验模式（不带 --write），不应改动任何文件
  const before = readGradle();
  execFileSync(process.execPath, ['scripts/sync-version.mjs'], { cwd: repo, stdio: 'pipe' });
  assert.equal(readGradle(), before, '校验模式不应写文件');
});

test('同一文件里的 versionCode 与 versionName 能被一次 --write 同时修正', () => {
  const original = readGradle();
  const v = pkgVersion();
  try {
    // 故意把两处都改错，模拟只改了 package.json 的常见情况
    const broken = original
      .replace(/versionCode \d+/, 'versionCode 1')
      .replace(/versionName '[^']*'/, "versionName '0.0.0'");
    fs.writeFileSync(gradle, broken, 'utf8');

    execFileSync(process.execPath, ['scripts/sync-version.mjs', '--write'], { cwd: repo, stdio: 'pipe' });

    const fixed = readGradle();
    const expectedCode = v.split('.').map((n, i) => Number(n) * [100, 10, 1][i]).reduce((a, b) => a + b, 0);
    assert.match(fixed, new RegExp(`versionCode ${expectedCode}\\b`), 'versionCode 应被修正');
    assert.match(fixed, new RegExp(`versionName '${v.replace(/\./g, '\\.')}'`), 'versionName 应被修正');

    // 再跑一次校验应通过
    execFileSync(process.execPath, ['scripts/sync-version.mjs'], { cwd: repo, stdio: 'pipe' });
  } finally {
    fs.writeFileSync(gradle, original, 'utf8');
  }
});
