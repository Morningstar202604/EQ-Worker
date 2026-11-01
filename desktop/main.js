// EQ-Worker · Windows 桌面壳（Electron）
// 设计原则：
//  1. 网页版本身是零依赖单文件，壳只负责开窗、给 localStorage 一个安全的用户数据目录；
//  2. 不开 nodeIntegration、不加载远程内容，外链一律交给系统浏览器；
//  3. 无安装器依赖：打包为免安装 zip（解压即用），后续需要时可补 electron-builder 生成 setup.exe。
//  4. 开发态：设置 EQ_DEV_URL 时加载该地址并自动打开 DevTools；未设置时始终加载本地 index.html。
const { app, BrowserWindow, shell, Menu } = require('electron')
const path = require('path')

/** 仅接受 http(s) 的 dev-server 地址，避免 file:// 或自定义协议被误注入。 */
function resolveDevUrl() {
  const raw = (process.env.EQ_DEV_URL || '').trim()
  if (!raw) return null
  if (!/^https?:\/\//i.test(raw)) {
    console.warn('[desktop] EQ_DEV_URL 只支持 http(s)，已忽略：' + raw)
    return null
  }
  return raw
}

function createWindow() {
  const devUrl = resolveDevUrl()
  const win = new BrowserWindow({
    width: 1280,
    height: 880,
    minWidth: 960,
    minHeight: 640,
    title: 'EQ-Worker',
    backgroundColor: '#f6f1e4',
    icon: path.join(__dirname, 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  })

  Menu.setApplicationMenu(null)
  win.setMenuBarVisibility(false)

  // 页面内打开的新窗口一律拒绝，外链交给系统默认浏览器
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })

  /* 权限一律拒绝，只保留剪贴板写权限（复制话术需要）。
     media / geolocation / notifications / midi / clipboard-read 等全部走 deny，
     避免网页被注入后静默申请麦克风、摄像头或通知权限。 */
  win.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(permission === 'clipboard-sanitized-write')
  })

  if (devUrl) {
    win.loadURL(devUrl)
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(path.join(__dirname, 'index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
