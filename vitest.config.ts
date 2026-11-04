import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: false,
    include: ['tests/**/*.test.ts', 'packages/**/*.test.ts', 'apps/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'json-summary', 'html'],
      // 只统计 Vitest 真正负责的代码。apps/cli、apps/mcp、apps/server 与 packages/node
      // 由 node:test 以真实进程/socket 覆盖（tests/cli.test.mjs 等），纳入这里会恒为 0，
      // 让阈值变成假门禁——它们该由 node 测试的结果说话，不靠 Vitest 覆盖率凑数。
      include: ['packages/*/src/**/*.ts', 'apps/studio/**/*.ts'],
      exclude: [
        '**/*.test.ts',
        '**/tests/**',
        '**/*.d.ts',
        'packages/node/**',
        'apps/cli/**',
        'apps/mcp/**',
        'apps/server/**'
      ],
      // 阈值按当前实测（90% 语句 / 82% 分支）留出余量：
      // 目的是挡住覆盖率断崖式下滑，不是追求数字好看
      thresholds: { statements: 85, branches: 75, functions: 90, lines: 85 }
    }
  }
});
