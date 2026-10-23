// 小程序引擎测试桩：通过 vm 模块模拟 CommonJS 环境加载 engine.js
// 规避根目录 package.json 的 "type": "module" 导致 .js 被当作 ESM 的问题
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const enginePath = path.resolve(__dirname, '../EQ-Worker-小程序/utils/engine.js');
const code = fs.readFileSync(enginePath, 'utf8');

// 模拟 wx 全局（引擎的 load/save 依赖）
global.wx = global.wx || {
  getStorageSync: () => null,
  setStorageSync: () => {},
  showToast: () => {}
};

// 创建 CommonJS 模拟上下文
const sandbox = {
  wx: global.wx,
  module: { exports: {} },
  exports: null,
  require: require,
  console: console,
  Date: Date,
  Math: Math,
  JSON: JSON,
  Array: Array,
  Object: Object,
  String: String,
  Number: Number,
  Boolean: Boolean,
  Error: Error,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout
};
sandbox.exports = sandbox.module.exports;

const context = vm.createContext(sandbox);
vm.runInContext(code, context);

const exported = sandbox.module.exports;

// 补充 engine.js 内部未 export 的纯工具函数
exported.clamp = vm.runInContext('clamp', context);
exported.avg = vm.runInContext('avg', context);
exported.esc = vm.runInContext('esc', context);

module.exports = exported;
