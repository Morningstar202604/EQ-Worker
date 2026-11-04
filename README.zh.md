<div align="center">

<img src="brand/logo-icon.svg" alt="EQ-Worker" width="88" height="88" />

# EQ-Worker

**记住你欠谁的人情。别让关系输在忘记上。**

人情账本 · 随礼参谋 · 话术参谋 · 关系体检 · 成就与修炼

本地优先 · 无账号 · 无服务器 · 可选 AI 自带 Key

<a href="README.md">English</a> · <b>简体中文</b>

[![Version](https://img.shields.io/badge/version-v3.5.0-orange)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-CC%20BY--NC%204.0-red)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-508%20passing-brightgreen)](tests/)
[![Platforms](https://img.shields.io/badge/platforms-web%20%C2%B7%20windows%20%C2%B7%20android%20%C2%B7%20wechat%20%C2%B7%20cli%20%C2%B7%20mcp-blueviolet)](#五种用法)

**在线试用：** [X33834](https://x33834.github.io/EQ-Worker/) · [badhope](https://badhope.github.io/EQ-Worker/) · [Morningstar202604](https://morningstar202604.github.io/EQ-Worker/)
**镜像：** [GitCode](https://gitcode.com/badhope/EQ-Worker) · [Gitee](https://gitee.com/badhope/EQ-Worker) · [GitHub](https://github.com/badhope/EQ-Worker)

</div>

---

## 它解决什么

大多数人不是不会处关系，而是**记不住、算不清、开不了口**。

| 你遇到的 | EQ-Worker 给的 |
| --- | --- |
| 谁帮过我、我欠谁一顿饭，散场就忘 | 每人一张关系卡：热度、信任、人情债、最后往来时间 |
| 婚礼满月乔迁，到底随多少 | 三档金额 + **计算过程摊开给你看**，不是拍脑袋给个数 |
| 想拒绝借钱、想催还、想道歉，话到嘴边咽回去 | 16 个场景 × 3 种语气，复制即用 |
| 关系淡了不自知 | 关系体检按健康度排序，直接告诉你先修哪个 |
| 一年到头说不清自己经营得怎样 | 近 12 个月回顾 + 13 个成就徽章 |

> 不是更复杂的通讯录，是**替你把人情想到前面**的助手。

---

## 界面

<table>
<tr>
<td width="50%"><img src="docs/screenshots/v3/01-assistant.png" alt="助手首页" /><br /><sub><b>今日行动</b>：打开就知道今天该做什么</sub></td>
<td width="50%"><img src="docs/screenshots/v3/02-ledger.png" alt="人情账本" /><br /><sub><b>人情账本</b>：送礼、收礼、借钱，净额一目了然</sub></td>
</tr>
<tr>
<td><img src="docs/screenshots/v3/03-gift.png" alt="随礼参谋" /><br /><sub><b>随礼参谋</b>：三档金额 + 为什么是这个数</sub></td>
<td><img src="docs/screenshots/v3/04-script.png" alt="话术参谋" /><br /><sub><b>话术参谋</b>：三种语气，带称呼，可复制</sub></td>
</tr>
<tr>
<td><img src="docs/screenshots/v3/08-settlement.png" alt="一键结清" /><br /><sub><b>一键结清</b>：金额可改小，支持只结一部分</sub></td>
<td><img src="docs/screenshots/v3/10-health.png" alt="关系体检" /><br /><sub><b>关系体检</b>：先修最该修的那段关系</sub></td>
</tr>
<tr>
<td><img src="docs/screenshots/v3/13-studio-practice.png" alt="修炼场" /><br /><sub><b>人情修炼场</b>：真实场景练分寸</sub></td>
<td><img src="docs/screenshots/v3/15-studio-achievements.png" alt="成就" /><br /><sub><b>成就徽章</b>：用真实往来解锁</sub></td>
</tr>
</table>

---

## 五种用法

同一个引擎，五种入口。数据格式通用，可互相导入导出。

### 1 · 网页版（零安装）

直接打开 `EQ-Worker.html`，或：

```bash
python3 -m http.server 8000   # 打开 http://localhost:8000
```

支持 PWA 离线安装。安卓与 Windows 桌面版共用同一份构建产物。

### 2 · Windows 桌面（安装包）

从 [Releases](https://github.com/badhope/EQ-Worker/releases/tag/v3.5.0) 下载 `EQ-Worker-3.5.0-x64.exe`（或取 tag 那次 CI 的 `EQ-Worker-windows-x64` artifact）双击安装：有开始菜单项、桌面快捷方式、卸载项，可选安装目录。

### 3 · CLI（终端里管人情）

```bash
eqw overview                       # 人情指数、账本、今日行动
eqw persons                        # 人脉列表
eqw person 王总                     # 单人完整画像
eqw gift 陈姐 --occasion 婚礼        # 随礼参谋
eqw script refuse_loan --to 老张    # 拒绝借钱怎么说
eqw record --to 王总 --type meal --title 请吃饭
eqw export --format csv > 账本.csv
```

全部命令带 `--json`，可直接喂给脚本或 `jq`。

### 4 · Web 后台

```bash
node dist-server/server.mjs
# → http://127.0.0.1:4317/  终端会打印访问令牌
```

概览、人脉、账本、体检、参谋五个视图。**只绑回环地址**，除健康检查外全部接口需 Bearer 令牌。

### 5 · MCP（让 AI 直接读你的人情数据）

Claude Desktop / Cursor / Cline 等支持 MCP 的客户端可以直接调用：

```json
{
  "mcpServers": {
    "eq-worker": {
      "command": "node",
      "args": ["/path/to/dist-mcp/eq-worker-mcp.mjs"]
    }
  }
}
```

提供 **15 个工具**（总览、人脉、单人、账本、体检、随礼、话术、成就、年度、搜索、提醒、修炼 + 记一笔、加人脉、加提醒）、**3 个资源**、**2 个提示**。

写操作按 MCP 规范声明 `readOnlyHint: false`，宿主会先弹确认。

---

## 为什么可信

| 承诺 | 怎么做到的 | 怎么验证 |
| --- | --- | --- |
| 数据不离开设备 | 无服务器、无账号、无埋点；AI 默认关闭，关闭时**零网络请求** | 有测试断言关闭状态下请求数 = 0 |
| 不会悄悄毁数据 | 迁移不安全就进写保护；损坏文件拒绝读取而非覆盖；文件存储用原子写 | `tests/cli.test.mjs` 有「损坏文件原样保留」用例 |
| 算得对 | core 引擎与 legacy 实现**逐函数对照**，6 组 fixture × 16 个函数 | `packages/core/tests/engine.parity.test.ts` |
| 真的能跑 | 不只跑单测：CLI 16 项、后台 17 项、MCP 18 项、E2E 8 项都是真实进程 / 真实 socket / 真实协议 / 真实浏览器 | `node scripts/run-tests.mjs` |

**508 个测试**：190 个 Node 测试 + 318 个 Vitest（30 文件）。

---

## 架构

```
┌──────────────────────────────────────────────────────────┐
│  packages/core · 纯逻辑，零依赖，浏览器与小程序都能用      │
│  引擎 · 账本 · 健康度 · 话术 · 成就 · 修炼 · 年度          │
└──────────────────────────────────────────────────────────┘
        ▲            ▲            ▲            ▲
        │            │            │            │
 ┌──────┴───┐ ┌──────┴───┐ ┌──────┴───┐ ┌──────┴────┐
 │ 旧版网页  │ │  Studio  │ │ 小程序    │ │ apps/*    │
 │ 单文件PWA │ │ Vite +TS │ │ 微信      │ │ CLI·后台  │
 └──────────┘ └──────────┘ └──────────┘ │ ·MCP      │
                                        └───────────┘
      localStorage                    JSON 文件（原子写）
```

**分层原则**：`core` 里不能出现 `node:fs`——它要进浏览器和小程序。凡是依赖文件系统的能力都放 `packages/node`。这条边界有构建验证：`vite build` 会因为 `node:fs` 直接失败。

---

## 快速开始

```bash
pnpm install
pnpm run verify    # 版本一致性 → 七套构建 → lint → 190 测试 → 类型检查 → 318 测试 → 双端构建
```

单独构建某端：

```bash
node build.js                     # 旧版网页（同步到 android / desktop）
node scripts/build-cli.mjs         # CLI   → dist-cli/eqw.mjs
node scripts/build-server.mjs      # 后台  → dist-server/
node scripts/build-mcp.mjs         # MCP   → dist-mcp/
cd desktop && npx electron-builder --win nsis   # 安装包
```

---

## 文档

| | |
| --- | --- |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 分层、边界与取舍 |
| [docs/AUDIT.md](docs/AUDIT.md) | 功能真实性核查报告 |
| [docs/adr/](docs/adr/) | 5 篇架构决策记录 |
| [CHANGELOG.md](CHANGELOG.md) | 版本历史与验证证据 |
| [CONTRIBUTING.md](CONTRIBUTING.md) | 开发约定 |
| [SECURITY.md](SECURITY.md) | 漏洞上报与安全边界 |
| [ROADMAP.md](ROADMAP.md) | 计划与完成标准 |

---

## 许可

[CC BY-NC 4.0](LICENSE) · 个人使用与学习自由，商业使用需授权。

<div align="center">

**人情不是算计，是把别人放在心上。**

</div>
