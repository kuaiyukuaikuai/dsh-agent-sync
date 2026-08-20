<div align="center">

# 🦾 dsh-agent-sync

**一键把 20+ 种 AI agent 的 MCP 服务器与 Skills 同步进 DeepSeek Harness（DSH）**

[English](./README.md) | **简体中文**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22.5-green)](./package.json)
[![DSH](https://img.shields.io/badge/DSH%20Plugin-v0.1.0-4f6ef7)](./package.json)
[![Awesome DSH Plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)
[![Plugin Market](https://img.shields.io/badge/DSH%20Plugin%20Market-awesome--dsh--plugin-8b93a1)](https://awesome-dsh-plugin.com/p/kuaiyukuaikuai/dsh-agent-sync/)
[![PR](https://img.shields.io/badge/PRs-welcome-16a34a)](https://github.com/kuaiyukuaikuai/dsh-agent-sync/pulls)

扫描本机安装的其他 AI agent —— **Codex、Claude Code、cc-switch、Hermes、opencode、
Gemini、Grok、Kimi、CodeBuddy、Trae、OpenClaw、Qoder、WorkBuddy、Zcode、Cursor、
Windsurf、Cline、Roo Code、Qwen Code 等** —— 并把它们的 **MCP 服务器**和
**Skills** 一键同步进 DSH。

</div>

---

## ✨ 功能特性

| 能力 | 说明 |
|---|---|
| 🔍 自动扫描 | 读取各 agent 的真实配置（`~/.codex/config.toml`、`~/.claude.json`、`~/.cc-switch/cc-switch.db`、`~/.codebuddy/mcp.json`、`~/.workbuddy/.mcp.json` …），发现 MCP 服务器与 Skills |
| ⚡ 一键同步 MCP | 以 `@deepseek-ai/dsh-mcp-client` 实例写入每个 profile 的 `cordis.patch.yml`（自动修复非法 YAML）→ 变成 `mcp__<server>__<tool>` 工具 |
| 🧠 一键同步 Skills | 把技能包拷入/链接到 `$DSH_HOME/skills`（**全局**）或 `<workspace>/.dsh/skills`（**按工作区**），由 DSH 的 skill-filesystem 提供方自动发现 |
| 🗂️ 作用域管理 | **MCP/Skills 管理**页：启停开关、移除；技能按全局 + 各工作区 Tab 分组展示 |
| ➕ 添加 MCP / Skill | 手动添加——MCP 用表单（stdio / streamable-http）；Skill 从**文件夹 / 单个 .md / .zip**（或拖放）加入全局或某工作区 |
| ⇄ 迁移技能 | 在全局 / 工作区之间**移动或复制**技能（迁移弹窗，多选） |
| 🏷️ 技能分组 | 建命名分组、绑定技能、按组筛选列表 |
| 📄 技能内容查看 | 点击技能 → 详情弹窗展示元数据 **和 SKILL.md 正文** |
| 🗑️ 删除二次确认 | 移除按钮先武装 3 秒内联确认（超时自动还原） |
| ⚙️ 配置 | **Skill 同步方式**（复制 / 软连接 junction）+ **MCP 同步目标**（全部 / desktop / web profile），⚙️ 设置弹窗修改 |
| 🔀 启停开关 | 对任意已同步的 MCP 服务器 / skill 一键停用或启用——停用的 MCP 从 profile patch 移除，停用的 skill 把 `SKILL.md` 改名为 `SKILL.md.disabled`（对发现隐藏，随时可逆） |
| 🖥️ GUI 面板 | 设置 → **MCP/Skills**：居中 MCP/Skills 切换、胶囊 Tab 与按钮、卡片网格、搜索 |
| 🛠️ 模型工具 | `agent_sync_scan` / `agent_sync_do` / `agent_sync_status` / `agent_sync_config` / `agent_sync_add_skill` / `agent_sync_toggle` / `agent_sync_remove` / `agent_sync_sources` |
| 🧩 易扩展 | 通用 agent 注册表（`AGENT_DEFS`）——新增一个 agent 只需一行 |

## 🚀 快速开始

### 环境要求

- 运行中的 DSH（桌面版或 headless），**Node.js ≥ 22.5**
- 需要同步的 agent 必须已安装在本机（插件不内置任何 agent 数据）

### 安装

**方式 A：作为 profile bundle（推荐）**

把 `dsh-agent-sync` 加进 profile 的 `dsh.profile.bundles` 并安装：

```bash
cd "$DSH_HOME/profiles/<name>"
pnpm add dsh-agent-sync        # 或：pnpm add github:kuaiyukuaikuai/dsh-agent-sync
```

重启 DSH。随包自带的 [`cordis.patch.yml`](./cordis.patch.yml) 会自动挂载插件行。

**方式 B：手动加行**

把包放到 profile 可解析的 `node_modules`，然后在 `$DSH_HOME/profiles/<name>/cordis.patch.yml` 追加：

```yaml
- insert:
    - id: dsh-agent-sync
      name: 'dsh-agent-sync'
```

重启 DSH。

## 📖 使用

### GUI 面板

**设置 → MCP/Skills**（主页 **MCP/Skills 管理**）

- **管理（主页）** —— 居中的 **MCP / Skills** 切换；卡片网格，每张卡片带**开关**（启停合一）与**移除按钮（3 秒内联确认）**；已停用卡片置灰并带徽标。**Skills 按作用域分组**：全局（`~/.dsh/skills`）与各工作区（`<workspace>/.dsh/skills`），工作区 Tab + 搜索框 + 技能分组筛选
- **工具栏（切换行右侧）** —— **⇄ 迁移技能**（跨作用域移动/复制技能）与 **＋ 添加 MCP / ＋ 添加 Skill**（手动添加）
- **MCP/Skills同步 →** —— 一个按钮，点击进入同步页：来源 Tab（常用 agent +「更多 ▾」）、全选、同步按钮（可**选择同步到全局或某工作区**）、自定义源
- **＋ 添加 Skill 弹窗** —— 选**文件夹**（目录束）/ **单个 .md** / **.zip**，或直接把文件**拖放到弹窗**；选择目标作用域（全局 / 工作区）
- **⚙️ 设置弹窗** —— **Skill 同步方式**（复制 / 软连接 junction）与 **MCP 同步目标**（全部 / desktop / web profile）

> **UI 实现** —— 不依赖组件库。面板为纯 React（`React.createElement`）+ DSH 主题变量（`--dsw-alias-*`）自绘，胶囊 Tab 与按钮；开关是自绘的小型 CSS 组件。

### 模型工具

```
agent_sync_scan        # 列出可同步内容（env 只显示键名，不泄露值）
agent_sync_do          # mcp/skills: ["all"] 或名称；scope: 全局或某工作区路径
agent_sync_config      # 读取/设置 { skillSyncMode: copy|link, syncProfiles: all|desktop|web }
agent_sync_add_skill   # 从本地目录（含 SKILL.md）或 .md 文件添加技能，scope 可选
agent_sync_toggle      # 启停已同步的 mcp/skill（{type, name, enabled}）
agent_sync_status      # 当前 DSH 状态 + 同步台账（含已停用条目）
agent_sync_remove      # 移除已同步的 mcp/skill
agent_sync_sources     # 管理自定义源（list / add / delete）
```

## 📦 支持的 agent

| 来源 | 读取配置 |
|---|---|
| Codex | `~/.codex/config.toml`（`mcp_servers`）+ `~/.codex/skills` |
| Claude Code | `~/.claude.json`、`~/.claude/settings.json` + skills + plugins |
| cc-switch | `~/.cc-switch/cc-switch.db`（`mcp_servers` / `skills` 表） |
| Hermes | `~/.hermes/config.{yaml,yml,json}` |
| opencode | `~/.config/opencode/{opencode,config}.json` |
| Gemini | `~/.gemini/settings.json` |
| Grok | `~/.grok/config.*` |
| Kimi | `~/.kimi/config.toml`（`mcp.*`） |
| CodeBuddy | `~/.codebuddy/mcp.json` |
| Trae | `~/.trae-cn/mcp.json` |
| OpenClaw | `~/.openclaw` / `~/.clawdbot` 的 `config.*` |
| Qoder | `~/.qoder*/mcp.json` |
| WorkBuddy | `~/.workbuddy/.mcp.json` |
| Zcode | `~/.zcode/config.json` |
| 通义灵码 | `~/.lingma/mcp.json` |
| CodeMoss | `~/.codemoss/config.json` |
| Copilot | `~/.copilot/mcp.json` |
| Cursor | `~/.cursor/mcp.json` |
| Windsurf | `~/.codeium/windsurf/mcp_config.json` |
| Cline | `~/.cline/mcp_settings.json` |
| Roo Code | `~/.roo/mcp_settings.json` |
| Qwen Code | `~/.codeqwen/mcp.json` |
| 自定义 | 你自己的源（JSON / TOML / 技能目录） |

所有路径都相对用户主目录 → **任何机器**上装了对应 agent 就能扫（Windows / macOS / Linux），JSON、类 YAML、TOML 三种配置格式都能解析。

## 🔧 工作原理

```
其他 agent 的配置 ──► 扫描 ──► 同步 ──► DSH
  ~/.codex/...                    │
  ~/.claude.json                  ├─ MCP   → profiles/*/cordis.patch.yml（dsh-mcp-client 行）
  ~/.cc-switch/cc-switch.db       │
  ~/.workbuddy/.mcp.json          └─ Skills → $DSH_HOME/skills/<name>/SKILL.md
  ...
```

- **MCP** 写入每个 profile 的 `cordis.patch.yml`（插件管理的 `# --- dsh-agent-sync managed ---` 段，文件损坏会自动修复）。桌面 GUI 壳在启动时一次性组合 profile，所以 **MCP 在下次重启 DSH 后生效**；`dsh` CLI / headless 启动路径会通过 HMR 热生效。
- **Skills** 默认**复制**、也可**软连接（junction，`skillSyncMode: link`）**到 `$DSH_HOME/skills`（全局）或 `<workspace>/.dsh/skills`（按工作区），由挂载了 `skill-filesystem` 提供方的 agent preset 会话自动发现。软连接模式下停用 = 移除 junction（不碰源目录），启用 = 重建。

## ⚠️ 安全说明

- 同步 MCP 会**原样复制 env 里的值**（数据库密码、API Key 等）到 `cordis.patch.yml` 与 `$DSH_HOME/agent-sync/state.json` —— 与源配置本来就明文存放一致。
- 扫描结果**只列 env 键名，绝不输出值**。
- 请把 `state.json` / patch 文件当密钥对待；建议使用带过期时间的 token，能引环境变量就引环境变量。

## ❓ 常见问题

**为什么什么都扫不到？**
本机没装这些 agent，或该 agent 的配置在别处。用「自定义源」可以指向任意 JSON / TOML / 技能目录。

**同步 MCP 后需要重启 DSH 吗？**
需要——桌面 GUI 壳启动时一次性组合 profile；`dsh` CLI / headless 路径会热生效。

**能移除吗？**
可以——GUI「MCP/Skills 管理」区有移除按钮（带 3 秒内联确认），或用 `agent_sync_remove`。

## 🧑‍💻 开发

```bash
pnpm install
pnpm test          # node --test
```

```
index.mjs        Host 插件：扫描器、同步、HTTP 路由（进程内实现，仅用 Node 内置能力）
client.js        浏览器面板（lazy-CJS，零构建）—— 注册 设置 → MCP/Skills同步
cordis.patch.yml  bundle 补丁：挂载插件行
plugin-market.json   DSH 插件市场投稿条目
```

## 🛒 DSH 插件市场

已收录进 [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) 社区精选列表——可在 **DSH → 设置 → 插件市场** 找到、访问 [awesome-dsh-plugin.com](https://awesome-dsh-plugin.com/p/kuaiyukuaikuai/dsh-agent-sync/)，或直接安装：

```bash
dsh plugin --profile web add github:kuaiyukuaikuai/dsh-agent-sync
```

## 📄 开源协议

[MIT](./LICENSE)
