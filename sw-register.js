// Service Worker 注册：仅 https / http 环境启用。
// file:// 直接打开单文件时（README 承诺的"完全没网也能用"场景），
// 浏览器不支持 SW 会抛错并污染 console —— 静默跳过，功能不受影响。
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(function () { /* 环境不支持则忽略 */ });
}
