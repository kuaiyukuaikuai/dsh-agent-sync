<div align="center">

# 🦾 dsh-agent-sync

**One-click sync of MCP servers & Skills from 20+ AI agents into DeepSeek Harness**

**English** | [简体中文](./README.zh-CN.md)

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22.5-green)](./package.json)
[![DSH](https://img.shields.io/badge/DSH%20Plugin-v0.1.0-4f6ef7)](./package.json)
[![Plugin Market](https://img.shields.io/badge/DSH%20Plugin%20Market-awesome--dsh--plugin-8b93a1)](https://awesome-dsh-plugin.com/p/kuaiyukuaikuai/dsh-agent-sync/)
[![PR](https://img.shields.io/badge/PRs-welcome-16a34a)](https://github.com/kuaiyukuaikuai/dsh-agent-sync/pulls)

Scans other AI agents installed on this machine — **Codex, Claude Code, cc-switch,
Hermes, opencode, Gemini, Grok, Kimi, CodeBuddy, Trae, OpenClaw, Qoder, WorkBuddy,
Zcode, Cursor, Windsurf, Cline, Roo Code, Qwen Code, …** — and syncs their **MCP
servers** and **Skills** into DSH with one click.

</div>

---

## ✨ Features

| Capability | What it does |
|---|---|
| 🔍 Auto-scan | Reads each agent's real config (`~/.codex/config.toml`, `~/.claude.json`, `~/.cc-switch/cc-switch.db`, `~/.codebuddy/mcp.json`, `~/.workbuddy/.mcp.json`, …) and discovers MCP servers + Skills |
| ⚡ One-click sync MCP | Writes servers as `@deepseek-ai/dsh-mcp-client` instances into every profile's `cordis.patch.yml` (auto-repairs invalid YAML) → they become `mcp__<server>__<tool>` tools |
| 🧠 One-click sync Skills | Copies skill bundles into `$DSH_HOME/skills`, auto-discovered by DSH's skill-filesystem provider |
| 🔀 Enable / Disable | Toggle any synced MCP server or skill on/off — disabled MCPs are dropped from the profile patch, disabled skills have their `SKILL.md` renamed to `SKILL.md.disabled` (hidden from discovery, fully reversible) |
| 🖥️ GUI panel | Settings → **MCP/Skills同步**: per-source tabs (main + "More"), MCP/Skills switch, select-all, and a profile-grouped status view |
| 🛠️ Model tools | `agent_sync_scan` / `agent_sync_do` / `agent_sync_status` / `agent_sync_remove` / `agent_sync_sources` |
| 🧩 Extensible | A generic agent registry (`AGENT_DEFS`) — adding a new agent is one line |

## 🚀 Quick start

### Prerequisites

- A running DSH (desktop or headless) with **Node.js ≥ 22.5**
- The agents you want to sync must be installed on the same machine (nothing is shipped with the plugin)

### Install

**Option A — as a profile bundle (recommended)**

Add `dsh-agent-sync` to your profile's `dsh.profile.bundles` and install it:

```bash
cd "$DSH_HOME/profiles/<name>"
pnpm add dsh-agent-sync        # or: pnpm add github:kuaiyukuaikuai/dsh-agent-sync
```

Restart DSH. The bundled [`cordis.patch.yml`](./cordis.patch.yml) mounts the plugin automatically.

**Option B — manual row**

Place the package where your profile can resolve it, then append to
`$DSH_HOME/profiles/<name>/cordis.patch.yml`:

```yaml
- insert:
    - id: dsh-agent-sync
      name: 'dsh-agent-sync'
```

Restart DSH.

## 📖 Usage

### GUI panel

**Settings → MCP/Skills同步**

- **Source tabs** — commonly used agents on the first row, less common ones under **More ▾**
- **可同步的 MCP / 可同步的 Skills** — switch between them, tick servers/skills, **select-all** per view, then **sync**
- **DSH 现状** — grouped by profile (`desktop` / `web`), each with its MCP entries and Skills, **停用/启用** toggles and remove buttons; disabled items are listed below so you can re-enable them
- **Custom sources** — add a JSON / TOML / directory source on the fly

### Model tools

```
agent_sync_scan      # list what can be synced (env values are hidden, keys only)
agent_sync_do        # mcp: ["all"] or names, skills: ["all"] or names
agent_sync_toggle    # enable/disable a synced mcp/skill ({type, name, enabled})
agent_sync_status    # current DSH-side state + sync bookkeeping (incl. disabled items)
agent_sync_remove    # remove a synced mcp/skill
agent_sync_sources   # manage custom sources (list / add / delete)
```

## 📦 Supported agents

| Source | Config read |
|---|---|
| Codex | `~/.codex/config.toml` (`mcp_servers`) + `~/.codex/skills` |
| Claude Code | `~/.claude.json`, `~/.claude/settings.json` + skills + plugins |
| cc-switch | `~/.cc-switch/cc-switch.db` (`mcp_servers` / `skills` tables) |
| Hermes | `~/.hermes/config.{yaml,yml,json}` |
| opencode | `~/.config/opencode/{opencode,config}.json` |
| Gemini | `~/.gemini/settings.json` |
| Grok | `~/.grok/config.*` |
| Kimi | `~/.kimi/config.toml` (`mcp.*`) |
| CodeBuddy | `~/.codebuddy/mcp.json` |
| Trae | `~/.trae-cn/mcp.json` |
| OpenClaw | `~/.openclaw` / `~/.clawdbot` `config.*` |
| Qoder | `~/.qoder*/mcp.json` |
| WorkBuddy | `~/.workbuddy/.mcp.json` |
| Zcode | `~/.zcode/config.json` |
| Lingma | `~/.lingma/mcp.json` |
| CodeMoss | `~/.codemoss/config.json` |
| Copilot | `~/.copilot/mcp.json` |
| Cursor | `~/.cursor/mcp.json` |
| Windsurf | `~/.codeium/windsurf/mcp_config.json` |
| Cline | `~/.cline/mcp_settings.json` |
| Roo Code | `~/.roo/mcp_settings.json` |
| Qwen Code | `~/.codeqwen/mcp.json` |
| Custom | your own sources (JSON / TOML / skills directory) |

All paths are home-relative → **works on any machine** where those agents are installed
(Windows / macOS / Linux). Configs in JSON, YAML-ish, and TOML shapes are parsed.

## 🔧 How it works

```
other agents' configs ──► scan ──► sync ──► DSH
  ~/.codex/...                     │
  ~/.claude.json                   ├─ MCP   → profiles/*/cordis.patch.yml (dsh-mcp-client rows)
  ~/.cc-switch/cc-switch.db        │
  ~/.workbuddy/.mcp.json           └─ Skills → $DSH_HOME/skills/<name>/SKILL.md
  ...
```

- **MCP** is written into each profile's `cordis.patch.yml` (a managed `# --- dsh-agent-sync managed ---` section, repaired if the file was invalid). The desktop GUI shell composes once at boot, so **MCP activates on the next DSH restart**; the `dsh` CLI / headless boot hot-applies profile patches via HMR.
- **Skills** are copied into `$DSH_HOME/skills` and discovered by sessions whose agent preset mounts the `skill-filesystem` provider.

## ⚠️ Security notes

- Syncing MCP **copies env values verbatim** (DB passwords, API keys, …) into `cordis.patch.yml` and `$DSH_HOME/agent-sync/state.json` — same plaintext exposure as the source configs already have.
- Scan output only lists **env key names, never values**.
- Treat `state.json` / patch files as secrets; consider a token with an expiry and prefer environment-variable references where possible.

## ❓ FAQ

**Why don't I see any MCP/Skills?**
Nothing is installed on the machine yet, or that agent stores its config elsewhere. The `custom` source lets you point at any JSON/TOML/skills directory.

**Do I need to restart DSH after syncing MCP?**
Yes — the desktop GUI shell composes its profile once at boot. The `dsh` CLI/headless path hot-applies profile patches.

**Can I remove something?**
Yes — the GUI's **DSH 现状** section has remove buttons, or use `agent_sync_remove`.

## 🧑‍💻 Development

```bash
pnpm install
pnpm test          # node --test
```

```
index.mjs        Host plugin: scanners, sync, HTTP routes (in-process, Node built-ins only)
client.js        Browser panel (lazy-CJS, zero build) — registers Settings → MCP/Skills同步
cordis.patch.yml Bundle patch that mounts the plugin row
plugin-market.json  DSH plugin market submission entry
```

## 🛒 DSH Plugin Market

Once [PR #1729](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/1729) is merged, find it in **DSH → Settings → Plugin Market**, or install directly:

```bash
dsh plugin --profile web add github:kuaiyukuaikuai/dsh-agent-sync
```

## 📄 License

[MIT](./LICENSE)
