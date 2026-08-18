# dsh-agent-sync

> DSH 插件：扫描本机其他 AI agent（Codex / Claude Code / cc-switch / Hermes / opencode / Gemini / Grok / Kimi / CodeBuddy / Trae / OpenClaw / Qoder / WorkBuddy / Zcode / Cursor / Windsurf / Cline / Roo Code / Qwen Code / 自定义源等 20+ 种）的 **MCP 服务器**和 **Skills**，一键同步进 DeepSeek Harness（DSH）。

以下为中文说明（English section 见文末）。

---

## 中文说明

### 它能做什么

| 能力 | 说明 |
|---|---|
| 自动扫描 | 读取 `~/.codex/config.toml`、`~/.claude.json`、`~/.claude/settings.json`、`~/.claude/plugins/*/skills`、`~/.cc-switch/cc-switch.db`（SQLite 的 `mcp_servers` / `skills` 表）以及自定义源 |
| 一键同步 MCP | 把其他 agent 的 MCP 服务器写成 `@deepseek-ai/dsh-mcp-client` 实例，持久写入每个 profile 的 `cordis.patch.yml`（自动修复非法 YAML），重启后变成 `mcp__<server>__<tool>` 工具 |
| 一键同步 Skills | 把技能目录/文件拷入 `$DSH_HOME/skills`，由 DSH 的 `dsh-skill-filesystem` 自动发现 |
| 管理 | 查看已同步项、移除 MCP / Skill、管理自定义源 |
| GUI 面板 | 设置 → 「MCP/Skills同步」页面：来源 Tab 分类、勾选、全选 + 一键同步（Web 界面） |

### 在别人电脑上能用吗？

**能，逻辑是机器无关的**——插件不携带任何本机数据，它读取的是**运行它的那台电脑自己的** agent 配置：

- 目标机器上装了 Codex / Claude Code / cc-switch / Hermes / opencode / Gemini / Grok / Kimi / CodeBuddy / Trae / OpenClaw / Qoder / WorkBuddy / Cursor 等任一 agent，就能扫出那台机器对应的 MCP 和 skill；
- 没有安装任何 agent 的机器，扫描结果为空（正常）；
- 路径全部相对用户主目录（`~/.codex`、`~/.claude.json`、`~/.cc-switch/cc-switch.db`），Windows / macOS / Linux 通用（macOS/Linux 未实测，核心逻辑为标准 Node API）；
- 需要 **Node.js ≥ 22.5**（用内置 `node:sqlite` 读 cc-switch 数据库），DSH 本身已满足。

### 安装

把 `dsh-agent-sync` 安装到 DSH 的 profile 里，然后让组合挂载它。

**方式 A：作为 profile bundle（推荐）**

1. 在 `$DSH_HOME/profiles/<name>/package.json` 的 `dsh.profile.bundles` 里加一行 `"dsh-agent-sync"`；
2. 在 profile 目录执行 `pnpm install dsh-agent-sync`（或本地路径 / GitHub）；
3. 重启 DSH。`cordis.patch.yml`（本包自带）会自动插入 `dsh-agent-sync` 行。

**方式 B：手动加行**

1. 把包放到 profile 可解析的 `node_modules`（如 `$DSH_HOME/profiles/node_modules/dsh-agent-sync`）；
2. 在 `$DSH_HOME/profiles/<name>/cordis.patch.yml` 追加：

```yaml
- insert:
    - id: dsh-agent-sync
      name: 'dsh-agent-sync'
```

3. 重启 DSH。

### 使用

- **聊天工具**：`agent_sync_scan`（扫描）→ `agent_sync_do`（同步）→ `agent_sync_status`（查看）→ `agent_sync_remove`（移除）→ `agent_sync_sources`（自定义源）。
- **GUI 面板**：DSH Web 界面 → 设置（左下角）→ 「MCP/Skills同步」。

### 同步后的行为（重要）

- **MCP**：桌面版 DSH（`DSH Desktop.exe`）在启动时一次性组合 profile，**不会**热重载 `cordis.patch.yml`，所以 MCP 条目在**下次重启 DSH 后**才激活为工具；`dsh` CLI / headless 启动路径会通过 HMR 热生效。
- **Skills**：拷入 `$DSH_HOME/skills` 后，由挂载了 `dsh-skill-filesystem` 的 agent preset 会话自动发现。

### 安全提示

- 同步 MCP 会**原样复制 env 里的敏感值**（数据库密码、API Key 等）到 `cordis.patch.yml` 与 `$DSH_HOME/agent-sync/state.json`——和源配置本来就明文存放一致，但请知悉。
- 扫描结果**不会**输出 env/header 的值（只列键名），避免泄露。

### 提交到 DSH 插件市场

本仓库已准备好在 DSH 插件市场（awesome-dsh-plugin.com）发布：

1. 先把仓库推送到 GitHub（`https://github.com/kuaiyukuaikuai/dsh-agent-sync`）；
2. 打开插件市场注册仓库 [awesome-dsh-plugin/awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)（站点 [awesome-dsh-plugin.com](https://awesome-dsh-plugin.com)），用本仓库根目录的 [`plugin-market.json`](plugin-market.json) 提交条目（或按站点流程填写）；
3. 收录后，任何人都能在 DSH → 设置 → 插件市场里找到它，并一键安装：

```bash
dsh plugin --profile web add github:kuaiyukuaikuai/dsh-agent-sync
```

### 数据落点

| 内容 | 位置 |
|---|---|
| 插件自身状态 | `$DSH_HOME/agent-sync/state.json`、`sources.json` |
| MCP 条目 | `$DSH_HOME/profiles/*/cordis.patch.yml`（`# --- dsh-agent-sync managed ---` 段） |
| Skills | `$DSH_HOME/skills/<name>/` |

### 开发

```bash
pnpm install          # 需要 @deepseek-ai/dsh-tools 作为 peer
pnpm test             # node --test
```

结构：

```
index.mjs        Host 插件（扫描 / 同步 / 路由，进程内实现，无子进程依赖）
client.js        浏览器面板（lazy-CJS 协议，零构建）
cordis.patch.yml bundle 补丁：插入插件行
```

---

## English

`dsh-agent-sync` scans other AI agents installed on this machine (Codex, Claude
Code, cc-switch, custom sources) and one-click syncs their MCP servers and
skills into DeepSeek Harness.

- **MCP** → written into each profile's `cordis.patch.yml` as
  `@deepseek-ai/dsh-mcp-client` instances (persistent; the desktop GUI applies
  them on the next restart, the `dsh` CLI/headless hot-applies them).
- **Skills** → copied into `$DSH_HOME/skills` and auto-discovered by DSH.
- **GUI** → a management panel under Settings → "MCP/Skills同步" (web surface).
- **Machine-agnostic**: it reads each machine's own agent configs
  (`~/.codex`, `~/.claude.json`, `~/.cc-switch/cc-switch.db`), so it works on
  any machine that has those agents. Requires Node ≥ 22.5.

### Install

Either add the package to your profile's `dsh.profile.bundles` (the bundled
`cordis.patch.yml` inserts the plugin row), or append a manual insert row to
`$DSH_HOME/profiles/<name>/cordis.patch.yml`:

```yaml
- insert:
    - id: dsh-agent-sync
      name: 'dsh-agent-sync'
```

Then restart DSH. Use the `agent_sync_*` model tools or the settings panel.

### Security

Syncing MCP copies env values (secrets) verbatim into the profile patch and
`state.json`, same plaintext exposure as the source configs. Scan output only
shows env key names, never values.

## License

MIT
