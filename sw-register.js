// Service Worker 注册：仅真实网页环境（GitHub Pages / localhost）启用。
// 原生壳（Android WebViewAssetLoader 的虚拟 https 域 appassets.androidplatform.net、
// Windows Electron 的 file:// 等）与 file:// 直接打开场景不注册，
// 避免 WebView / Electron 中 SW 拦截或缓存导致白屏或更新异常。
var __rqHost = location.hostname || '';
var __rqIsWeb = /^https?:$/.test(location.protocol) &&
  /(github\.io$|^localhost$|^127\.0\.0\.1$|^0\.0\.0\.0$)/.test(__rqHost);
if ('serviceWorker' in navigator && __rqIsWeb) {
  navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(function () { /* 环境不支持则忽略 */ });
}
