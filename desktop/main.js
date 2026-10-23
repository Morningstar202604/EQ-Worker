// EQ-Worker · Windows 桌面壳（Electron）
// 设计原则：
//  1. 网页版本身是零依赖单文件，壳只负责开窗、给 localStorage 一个安全的用户数据目录；
//  2. 不开 nodeIntegration、不加载远程内容，外链一律交给系统浏览器；
//  3. 无安装器依赖：打包为免安装 zip（解压即用），后续需要时可补 electron-builder 生成 setup.exe。
const { app, BrowserWindow, shell, Menu } = require('electron')
const path = require('path')

function createWindow() {
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
      sandbox: true
    }
  })

  Menu.setApplicationMenu(null)
  win.setMenuBarVisibility(false)

  // 页面内打开的新窗口一律拒绝，外链交给系统默认浏览器
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })

  win.loadFile(path.join(__dirname, 'index.html'))
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
