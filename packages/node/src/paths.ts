import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

/**
 * 数据目录定位。优先级：
 * 1. 显式传入（--data 参数）
 * 2. 环境变量 EQWORKER_DATA_DIR
 * 3. 平台默认目录
 *
 * 用系统惯例而非「当前工作目录」，这样 CLI 在任何目录下执行都指向同一份数据。
 */
export function dataDir(explicit?: string): string {
  if (explicit) return resolve(explicit);
  const fromEnv = process.env.EQWORKER_DATA_DIR;
  if (fromEnv) return resolve(fromEnv);
  const home = homedir();
  switch (process.platform) {
    case 'win32':
      return join(process.env.APPDATA || join(home, 'AppData', 'Roaming'), 'EQ-Worker');
    case 'darwin':
      return join(home, 'Library', 'Application Support', 'EQ-Worker');
    default:
      return join(process.env.XDG_DATA_HOME || join(home, '.local', 'share'), 'eq-worker');
  }
}

export function ensureDataDir(dir: string): string {
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function resolveDataFile(explicit?: string): string {
  return join(dataDir(explicit), 'eq-worker.json');
}
