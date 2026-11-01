# EQ-Worker 桌面壳（Electron）

网页版是唯一事实源：`desktop/index.html` 由根目录 `node build.js` 从 `_app_dev.js` + `index.template.html`
生成并同步，壳本身不含任何业务逻辑。

## 两种启动方式

### 1. 本地产物（默认）

```bash
cd desktop
npm install
npm start          # 等价于 electron .
```

未设置 `EQ_DEV_URL` 时，壳加载同目录的 `index.html`（`win.loadFile`），与发布包行为一致。

### 2. 连 Vite dev-server（开发）

先在仓库根目录启动 Studio / Vite（默认 5173 端口），再在 **shell 里设置环境变量**后启动：

```bash
# PowerShell
$env:EQ_DEV_URL = "http://localhost:5173"; npm start

# cmd
set EQ_DEV_URL=http://localhost:5173 && npm start

# Git Bash / macOS / Linux
EQ_DEV_URL=http://localhost:5173 npm start
```

`EQ_DEV_URL` 只接受 `http(s)://` 地址；设置后窗口加载该地址并自动打开 DevTools（detach 模式）。
未设置或协议不合法时回退到本地 `index.html`。

不引入 `cross-env`：环境变量的写法由各平台 shell 自己负责，避免为一行脚本新增依赖。

## 安全默认

| 项 | 取值 | 原因 |
| --- | --- | --- |
| `contextIsolation` | `true` | 隔离预加载脚本与页面上下文 |
| `nodeIntegration` | `false` | 页面拿不到 Node API |
| `sandbox` | `true` | 渲染进程沙箱 |
| `webSecurity` | `true` | 保持同源策略，不关闭 CORS/混合内容检查 |
| 权限请求 | 一律拒绝 | `setPermissionRequestHandler` 只放行 `clipboard-sanitized-write`（复制话术），麦克风 / 摄像头 / 通知 / 定位 / MIDI / 剪贴板读全部 deny |
| 新窗口 | 一律拒绝 | `setWindowOpenHandler` 返回 `deny`，http(s) 外链交给系统浏览器 |
| 菜单 | 隐藏 | 单窗口应用，避免误触开发者菜单 |

## 构建免安装包

```bash
cd desktop
npm run dist:win     # bash build-win.sh
# 产物：desktop/dist/EQ-Worker-win-x64.zip
```

版本号与根 `package.json`、`android/app/build.gradle` 保持一致（当前 3.2.0）。
