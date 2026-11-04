import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: false,
    include: ['tests/**/*.test.ts', 'packages/**/*.test.ts', 'apps/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'json-summary', 'html'],
      include: ['packages/*/src/**/*.ts', 'apps/*/src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/tests/**', '**/*.d.ts'],
      // 阈值按当前实测（85% 语句 / 74% 分支）留出余量：
      // 目的是挡住覆盖率断崖式下滑，不是追求数字好看
      thresholds: { statements: 80, branches: 70, functions: 80, lines: 80 }
    }
  }
});
