<div align="center">

# 人情世故雷达

**RENQING · RADAR — 把人情账记明白，把关系经营成细水长流。**

人脉经营 · 人情账本 · 社交修炼 — 轻量、**本地优先**、隐私至上。

<a href="README.zh.md"><b>简体中文</b></a> · <a href="README.md">English</a>

[![平台](https://img.shields.io/badge/平台-网页%20PWA%20%2B%20微信小程序-2da44e)](https://gitcode.com/badhope/chushi-radar)
[![版本](https://img.shields.io/badge/版本-v2.8.1-orange)](https://gitcode.com/badhope/chushi-radar)
[![许可](https://img.shields.io/badge/许可-CC%20BY--NC%204.0-red)](LICENSE)

**多平台镜像：** [GitHub @badhope](https://github.com/badhope/chushi-radar) · [GitHub @x33834](https://github.com/x33834/chushi-radar) · [GitHub @Morningstar202604](https://github.com/Morningstar202604/chushi-radar) · [GitCode](https://gitcode.com/badhope/chushi-radar) · [Gitee](https://gitee.com/badhope/chushi-radar)

</div>

---

## ✨ 在线体验

| 渠道 | 链接 |
|---|---|
| **网页（GitHub Pages，即推即部署）** | <https://morningstar202604.github.io/chushi-radar/> |
| **镜像（GitHub @x33834）** | <https://x33834.github.io/chushi-radar/> |
| **镜像（GitHub @badhope）** | <https://badhope.github.io/chushi-radar/> |
| **品牌官网** | <https://morningstar202604.github.io/chushi-radar/%E5%AE%98%E7%BD%91/%E4%BA%BA%E6%83%85%E4%B8%96%E6%95%85%E9%9B%B7%E8%BE%BE%E5%AE%98%E7%BD%91.html> |

> **完全没网？** 下载 `人情世故雷达.html` 用浏览器直接打开，离线运行，功能完全一致。

---

## 📸 截图预览

| 雷达总览 | 人脉管理 | 快速记录 |
| --- | --- | --- |
| ![雷达总览](docs/screenshots/01-radar.png) | ![人脉管理](docs/screenshots/02-persons.png) | ![快速记录](docs/screenshots/03-record.png) |

| 修炼场 | 我的数据中心 | 搜索高亮 |
| --- | --- | --- |
| ![修炼场](docs/screenshots/04-scenario.png) | ![我的](docs/screenshots/05-me.png) | ![搜索高亮](docs/screenshots/06-search.png) |

![人脉详情](docs/screenshots/07-detail.png)
*五维雷达图 + 热度指标 + 往来时间线 + 关系解读*

---

## 🎯 这是什么

**人情世故雷达**是一款**人脉经营工具**，不是答题测评。

> 「人情」是润滑人际关系的那笔账 — 饭局、随礼、帮忙、关心，还有还不清的人情债。

旧版「处世 Radar」是 81 道题的社交智力测验；v2 起彻底重构为**经营型玩法**：

1. **花 10 秒**，在饭局散场后记录一笔往来
2. **雷达做剩下的** — 自动画像、计算人情热度、提醒你该走动、该还人情、该送祝福

### 适合谁

- 经常参加饭局/婚礼/聚会，想管好「人情账本」的人
- 常常忘记生日、错过节日问候、或不知不觉欠了人情的人
- 想修炼中国式社交场景的新手 — 内置 15 个情景修炼（分难度段位）

---

## 🔁 核心玩法（五模块闭环）

```
记录往来 → 自动画像 → 智能提醒 → 情景修炼 → 年度报告
```

| 模块 | 作用 |
| --- | --- |
| **雷达总览** | 五维画像（人脉规模/人情热度/往来频率/人情信用/处世智慧）+ 人情指数 + 智能提醒（节日/欠人情/久未往来/生日/待办，按紧急度配色） |
| **人脉管理** | 每人一张雷达卡，热度 = 事件加权 + 90 天半衰期衰减，可手动微调；搜索 / 身份筛选 / 三种排序 |
| **快速记录** | 10 类事件自动带人情值（饭局/互助/送礼/借钱/深聊…），支持撤销 |
| **修炼场** | 15 个中国式社交情景（随礼/挡酒/借钱/救场/圆场…），难度分级，练完涨处世智慧与段位 |
| **我的数据中心** | 月度洞察、近 6 月趋势、年度人情报告、待办管理、备份迁移（剪贴板/文件/CSV） |

---

## 📱 四端同构，数据结构互通

| 端 | 说明 |
| --- | --- |
| **网页版（PWA）** | 单文件自包含 HTML（约 1.1MB，零构建），离线可用，可添加到主屏幕当 App 用；内置 ECharts 开源可视化 |
| **安卓 App（APK）** | 原生 WebView 壳，仅 **1.4MB**；`android/` 一键构建，正式签名可长期更新 |
| **Windows 桌面版** | Electron 免安装包，解压即用（不写注册表）；`desktop/` 一键构建 |
| **微信小程序** | 完整小程序工程（`人情世故雷达-小程序/`），Canvas 手绘雷达零依赖；网页↔小程序数据结构互通（SCHEMA_VERSION） |

> 四端共用同一份 `index.html` 与同一套数据结构，备份文件（JSON / CSV / 剪贴板文本）跨端可直接导入。
> 构建与发布见 [`docs/双端构建与发布.md`](docs/双端构建与发布.md)，品牌规范见 [`brand/BRAND.md`](brand/BRAND.md)。

### 小程序视觉亮点

- **自定义 UI 组件** — 统一模态框 / Toast 动效系统（替代全部原生 wx 模态框）
- **搜索高亮** — 实时黄色高亮匹配字符（姓名/身份/标签）+ 匹配计数
- **按压反馈** — 所有交互卡片加入缩放按压动效
- **紧急脉冲** — 逾期提醒红色光晕脉冲
- **内置农历** — 支持 1900–2100 年节日换算

---

## 🔐 数据与隐私

- **零服务器** — 所有数据仅存本机（浏览器 localStorage / 小程序本地缓存）
- **无广告、无埋点、无需注册** — 你才是用户，不是商品
- **无缝迁移** — 导出备份 → 复制剪贴板 → 新设备粘贴导入；网页↔小程序格式互通
- 内置农历节日提醒（1900–2100）

---

## 🆕 v2.8.1 新特性

- **统一 UI 组件** — 全部 7 个页面的模态框 / Toast 替换为自定义动效组件
- **搜索高亮** → 字符级黄色高亮 + 匹配计数
- **关系网络图** → Canvas 环形布局（网页端）
- **年度报告 PNG 导出** → html2canvas 一键图片分享（网页端）
- **性能优化** → computePerson 全局缓存 + 事件版本号失效
- **PWA 支持** → Service Worker Cache First 离线访问
- **构建系统** → 零依赖 ESM 构建脚本（`build.js`）
- **单元测试** → 10 个测试通过 `node --test`

---

## 🛠 技术栈

| 层面 | 选型 |
| --- | --- |
| 语言 | 原生 JavaScript（零框架） |
| 图表 | ECharts 5（内联）/ Canvas 2D（小程序） |
| 存储 | localStorage / wx.storage（纯本地） |
| PWA | Service Worker + Cache First |
| 构建 | `build.js` — ESM，零依赖 |
| 测试 | `node --test` 内置运行器 |

---

## 📦 快速开始

- **网页版**：直接打开 `人情世故雷达.html`（建议 Chrome / Safari / 微信内置浏览器）
- **小程序**：微信开发者工具导入 `人情世故雷达-小程序/` 预览

---

## 📄 许可

Creative Commons Attribution-NonCommercial 4.0 International（CC BY-NC 4.0），详见 `LICENSE`。

---

<div align="center">

⭐ **觉得有用就给个 Star** · 🍴 **Fork 改造你自己的** · 🐛 **Issue 欢迎来提**

</div>
