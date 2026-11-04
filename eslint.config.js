import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * Lint 配置。
 *
 * 目标不是「零警告」的姿态，而是挡住几类真会出事的写法：
 * 未使用的导入与变量（死代码堆积）、显式 any 绕过类型、条件里用 ==。
 *
 * 不同运行环境用独立配置块：TypeScript 模块、微信小程序（CJS + wx 全局）、
 * 浏览器脚本、Service Worker、构建脚本。混在一起会互相污染全局声明。
 */
export default tseslint.config(
  {
    ignores: [
      'dist-*/**',
      'node_modules/**',
      'desktop/dist/**',
      'desktop/node_modules/**',
      'android/**',
      'EQ-Worker-小程序/utils/core.bundle.js',
      'vendor/**',
      'brand/dist/**',
      '.tmp/**',
      '**/*.min.js',
      'eslint.config.js',
      // legacy 单文件应用：历史上无 lint 基线。它有独立语法检查与 62 个行为测试。
      '_app_dev.js',
      'test-fixtures/**',
      '**/*.d.ts',
      'src/node-stream-web.d.ts'
    ]
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        console: 'readonly', process: 'readonly', Buffer: 'readonly',
        URL: 'readonly', URLSearchParams: 'readonly', fetch: 'readonly',
        setTimeout: 'readonly', clearTimeout: 'readonly',
        setInterval: 'readonly', clearInterval: 'readonly',
        structuredClone: 'readonly', document: 'readonly', window: 'readonly',
        localStorage: 'readonly', sessionStorage: 'readonly', navigator: 'readonly',
        Blob: 'readonly', FileReader: 'readonly', HTMLElement: 'readonly',
        HTMLInputElement: 'readonly', HTMLTextAreaElement: 'readonly',
        HTMLButtonElement: 'readonly', Node: 'readonly', Event: 'readonly',
        AbortController: 'readonly'
      }
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
      '@typescript-eslint/no-require-imports': 'off',
      'no-console': 'off',
      eqeqeq: ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-undef': 'off'
    }
  },

  {
    files: ['**/*.test.ts', '**/tests/**/*.ts', 'tests/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        process: 'readonly', console: 'readonly', Buffer: 'readonly', URL: 'readonly',
        fetch: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly',
        setInterval: 'readonly', clearInterval: 'readonly', global: 'readonly',
        document: 'readonly', window: 'readonly', localStorage: 'readonly',
        Blob: 'readonly', FileReader: 'readonly', structuredClone: 'readonly',
        require: 'readonly', module: 'readonly'
      }
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      // 测试里的桩函数需要保留真实签名（参数不用是常态），全部放行
      '@typescript-eslint/no-unused-vars': 'off',
      'no-unused-vars': 'off',
      'no-empty': 'off',
      'no-undef': 'off'
    }
  },

  {
    files: ['EQ-Worker-小程序/**/*.js'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'commonjs',
      globals: {
        wx: 'readonly', Page: 'readonly', App: 'readonly', getApp: 'readonly',
        getCurrentPages: 'readonly', console: 'readonly', setTimeout: 'readonly',
        clearTimeout: 'readonly', setInterval: 'readonly', clearInterval: 'readonly',
        require: 'readonly', module: 'readonly', exports: 'readonly', getRegExp: 'readonly'
      }
    },
    rules: {
      'no-undef': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-empty': 'off'
    }
  },

  {
    files: ['apps/server/web/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        document: 'readonly', window: 'readonly', localStorage: 'readonly',
        fetch: 'readonly', alert: 'readonly', navigator: 'readonly',
        setTimeout: 'readonly', clearTimeout: 'readonly', console: 'readonly',
        URLSearchParams: 'readonly', Blob: 'readonly', URL: 'readonly', FileReader: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
      'no-empty': 'off'
    }
  },

  {
    files: ['sw.js', 'sw-register.js', 'desktop/sw.js', 'desktop/sw-register.js', 'desktop/main.js', 'build.js', 'scripts/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        self: 'readonly', caches: 'readonly', fetch: 'readonly', console: 'readonly',
        navigator: 'readonly', window: 'readonly', document: 'readonly',
        require: 'readonly', module: 'readonly', exports: 'readonly',
        process: 'readonly', Buffer: 'readonly', URL: 'readonly',
        setTimeout: 'readonly', clearTimeout: 'readonly'
      }
    },
    rules: {
      'no-undef': 'off',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
      'no-empty': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      eqeqeq: 'off',
      'no-empty': 'off'
    }
  }
);
