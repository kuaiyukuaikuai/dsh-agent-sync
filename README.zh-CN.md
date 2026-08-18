<div align="center">

# 🦾 dsh-agent-sync

**一键把 20+ 种 AI agent 的 MCP 服务器与 Skills 同步进 DeepSeek Harness（DSH）**

[English](./README.md) | **简体中文**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22.5-green)](./package.json)
[![DSH](https://img.shields.io/badge/DSH%20Plugin-v0.1.0-4f6ef7)](./package.json)
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
| 🧠 一键同步 Skills | 把技能包拷入 `$DSH_HOME/skills`，由 DSH 的 skill-filesystem 提供方自动发现 |
| 🖥️ GUI 面板 | 设置 → **MCP/Skills同步**：来源 Tab（一级 +「更多」）、MCP/Skills 切换、全选、按 profile 分组的现状视图 |
| 🛠️ 模型工具 | `agent_sync_scan` / `agent_sync_do` / `agent_sync_status` / `agent_sync_remove` / `agent_sync_sources` |
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

**设置 → MCP/Skills同步**

- **来源 Tab** —— 常用 agent 放第一行，冷门的在「更多 ▾」里
- **可同步的 MCP / 可同步的 Skills** —— 点击切换；勾选服务器/skill，支持**全选**，然后点同步
- **DSH 现状** —— 按 profile（`desktop` / `web`）分组，各自列出 MCP 条目与 Skills，可一键移除
- **自定义源** —— 随时添加 JSON / TOML / 技能目录源

### 模型工具

```
agent_sync_scan      # 列出可同步内容（env 只显示键名，不泄露值）
agent_sync_do        # mcp: ["all"] 或名称，skills: ["all"] 或名称
agent_sync_status    # 当前 DSH 状态 + 同步台账
agent_sync_remove    # 移除已同步的 mcp/skill
agent_sync_sources   # 管理自定义源（list / add / delete）
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
- **Skills** 拷入 `$DSH_HOME/skills`，由挂载了 `skill-filesystem` 提供方的 agent preset 会话自动发现。

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
可以——GUI「DSH 现状」区有移除按钮，或用 `agent_sync_remove`。

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

[PR #1729](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/1729) 合并后，可在 **DSH → 设置 → 插件市场** 找到，或直接安装：

```bash
dsh plugin --profile web add github:kuaiyukuaikuai/dsh-agent-sync
```

## 📄 开源协议

[MIT](./LICENSE)
