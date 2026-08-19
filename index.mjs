// dsh-agent-sync — Host half.
//
// Scans other AI agents installed on this machine (Codex, Claude Code,
// cc-switch, and user-defined custom sources) and lets the user one-click sync
// their MCP servers and skills into DSH:
//
//   - MCP servers   -> written into each profile's cordis.patch.yml as
//                      @deepseek-ai/dsh-mcp-client instances (persistent).
//   - Skills        -> copied into $DSH_HOME/skills so DSH's skill-filesystem
//                      provider discovers them.
//
// Implemented in-process with Node's built-in fs and node:sqlite (Node >= 22.5),
// so there are no runtime subprocess or helper-script dependencies.

import { homedir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { cp, mkdir, readFile, readdir, rename, rm, stat, symlink, writeFile } from 'node:fs/promises'
import { DatabaseSync } from 'node:sqlite'
import { defineTool } from '@deepseek-ai/dsh-tools'

export const name = 'dsh-agent-sync'
export const inject = ['tools']

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const HOME = homedir()
const DSH_HOME = process.env.DSH_HOME || join(HOME, '.dsh')
const DIR = join(DSH_HOME, 'agent-sync')
const STATE_FILE = join(DIR, 'state.json')
const SOURCES_FILE = join(DIR, 'sources.json')

const PATCH_MARK_START = '# --- dsh-agent-sync managed (sync source; edit via agent_sync_* tools) ---'
const PATCH_MARK_END = '# --- end dsh-agent-sync managed ---'

// ---------------------------------------------------------------------------
// Filesystem helpers
// ---------------------------------------------------------------------------

async function readText(p) {
  try { return await readFile(p, 'utf8') } catch { return undefined }
}

async function writeText(p, content) {
  await mkdir(dirname(p), { recursive: true })
  await writeFile(p, content)
}

async function exists(p) {
  try { await stat(p); return true } catch { return false }
}

async function listDir(p) {
  try { return (await readdir(p, { withFileTypes: true })).map((d) => d.name) } catch { return [] }
}

async function copyPath(src, dst) {
  await mkdir(dirname(dst), { recursive: true })
  await cp(src, dst, { recursive: true, force: true })
}

async function removePath(p) {
  await rm(p, { recursive: true, force: true })
}

// ---------------------------------------------------------------------------
// Minimal TOML parser (Codex config.toml)
// ---------------------------------------------------------------------------

function parseTomlValue(s) {
  s = String(s || '').trim()
  if (!s) return ''
  if (s.startsWith('[')) {
    return s.slice(1, s.lastIndexOf(']') < 0 ? s.length : s.lastIndexOf(']'))
      .split(',').map((x) => parseTomlValue(x)).filter((x) => x !== '')
  }
  if (s.startsWith('"')) {
    let t = s.slice(1)
    if (t.endsWith('"')) t = t.slice(0, -1)
    return t.replace(/\\"/g, '"').replace(/\\\\/g, '\\').replace(/\\n/g, '\n').replace(/\\t/g, '\t')
  }
  if (s.startsWith("'")) {
    let t = s.slice(1)
    if (t.endsWith("'")) t = t.slice(0, -1)
    return t
  }
  if (s === 'true') return true
  if (s === 'false') return false
  const n = Number(s)
  if (!Number.isNaN(n) && s !== '') return n
  return s
}

function parseToml(text) {
  const root = {}
  const stack = [root]
  const current = () => stack[stack.length - 1]
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    if (line.startsWith('[')) {
      const header = line.slice(1, line.lastIndexOf(']')).trim()
      const keys = header.split('.').map((k) => k.trim())
      let node = root
      for (const k of keys) {
        if (!node[k] || typeof node[k] !== 'object') node[k] = {}
        node = node[k]
      }
      stack.push(node)
      continue
    }
    const eq = line.indexOf('=')
    if (eq < 0) continue
    const key = line.slice(0, eq).trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '')
    current()[key] = parseTomlValue(line.slice(eq + 1))
  }
  return root
}

// ---------------------------------------------------------------------------
// Skill discovery
// ---------------------------------------------------------------------------

function parseSkillFrontmatter(text) {
  const out = { name: '', description: '' }
  if (!text || text.slice(0, 3) !== '---') return out
  const end = text.indexOf('\n---', 3)
  if (end < 0) return out
  for (const line of text.slice(3, end).split(/\r?\n/)) {
    const m = /^(\w[\w-]*):\s*(.*)$/.exec(line)
    if (!m) continue
    if (m[1] === 'name') out.name = m[2].trim().replace(/^["']|["']$/g, '')
    if (m[1] === 'description') out.description = m[2].trim().replace(/^["']|["']$/g, '')
  }
  return out
}

async function scanSkillsDir(dir) {
  const names = await listDir(dir)
  const out = []
  for (const n of names) {
    if (n === '.system') continue
    const full = join(dir, n)
    const skillMd = await readText(join(full, 'SKILL.md'))
    if (skillMd !== undefined) {
      const meta = parseSkillFrontmatter(skillMd)
      out.push({ name: meta.name || n, description: meta.description || '', src: full, kind: 'bundle' })
      continue
    }
    if (/\.md$/i.test(n)) {
      const text = await readText(full)
      const meta = parseSkillFrontmatter(text)
      const base = n.replace(/\.md$/i, '')
      out.push({ name: meta.name || base, description: meta.description || '', src: full, kind: 'flat' })
    }
  }
  const seen = new Map()
  for (const s of out) if (!seen.has(s.name)) seen.set(s.name, s)
  return [...seen.values()]
}

// 直接扫描某个 skills 根目录作为「真实状态」来源（不依赖会话的 skill 服务）：
// 目录束 <name>/SKILL.md（或 .disabled）与单文件 <name>.md（或 .md.disabled）。
async function listSkillsOnDisk(skillsRoot = join(DSH_HOME, 'skills')) {
  const names = await listDir(skillsRoot)
  const out = []
  for (const n of names) {
    if (n === '.system') continue
    const full = join(skillsRoot, n)
    const md = join(full, 'SKILL.md')
    const mdD = join(full, 'SKILL.md.disabled')
    let kind = null, enabled = null, file = null
    if (await exists(md)) { kind = 'bundle'; enabled = true; file = md }
    else if (await exists(mdD)) { kind = 'bundle'; enabled = false; file = mdD }
    else if (n.endsWith('.md.disabled')) { kind = 'flat'; enabled = false; file = full }
    else if (n.endsWith('.md')) { kind = 'flat'; enabled = true; file = full }
    if (!file) continue
    const meta = parseSkillFrontmatter((await readText(file)) || '')
    out.push({ name: meta.name || n.replace(/\.md(\.disabled)?$/i, ''), description: meta.description || '', enabled: !!enabled, kind, path: full })
  }
  return out
}

// 工作区技能根：<workspace>/.dsh/skills（与 DSH 的项目级 skill 发现一致）。
function workspaceSkillRoot(wsPath) {
  return join(wsPath, '.dsh', 'skills')
}

// 从 workspaceRegistry / sessions 服务发现本机已知工作区（去重、过滤失效目录）。
async function listWorkspaces(ctx) {
  const out = []
  const seen = new Set()
  const add = (path, label) => {
    if (!path || typeof path !== 'string' || path === '') return
    const key = process.platform === 'win32' ? path.toLowerCase() : path
    if (seen.has(key)) return
    seen.add(key)
    out.push({ path, label: label || basename(path) || path })
  }
  const reg = ctx ? ctx.get('workspaceRegistry') : undefined
  if (reg && typeof reg.list === 'function') {
    try {
      for (const ws of reg.list()) {
        if (ws && ws.path) add(ws.path, ws.title)
      }
    } catch { /* registry unavailable */ }
  }
  const sessions = ctx ? ctx.get('sessions') : undefined
  if (sessions && typeof sessions.list === 'function') {
    try {
      for (const s of sessions.list()) {
        const cwd = s && s.header ? s.header.cwd : undefined
        if (cwd) add(cwd)
      }
    } catch { /* sessions unavailable */ }
  }
  return out
}

// ---------------------------------------------------------------------------
// MCP normalization
// ---------------------------------------------------------------------------

function sanitizeServerName(name) {
  let s = String(name).replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 32)
  if (!s) s = 'mcp'
  return s
}

function sanitizeSkillName(name) {
  let s = String(name).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 64)
  if (!s) s = 'skill'
  return s
}

function normalizeMcp(name, raw, source) {
  raw = raw && typeof raw === 'object' ? raw : {}
  const type = raw.type || (raw.command ? 'stdio' : raw.url ? 'http' : undefined)
  const serverName = sanitizeServerName(name)
  if (type === 'stdio' || (type === undefined && raw.command)) {
    const env = {}
    if (raw.env && typeof raw.env === 'object') {
      for (const k of Object.keys(raw.env)) {
        const v = raw.env[k]
        if (typeof v === 'string' || typeof v === 'number') env[k] = String(v)
      }
    }
    const config = {
      serverName,
      transport: 'stdio',
      command: String(raw.command),
      args: Array.isArray(raw.args) ? raw.args.map(String) : [],
      env,
    }
    if (raw.cwd) config.cwd = String(raw.cwd)
    if (raw.startup_timeout_sec) config.toolCallTimeoutMs = Number(raw.startup_timeout_sec) * 1000
    return { name: serverName, source, config }
  }
  if (type === 'http' || type === 'streamable-http' || raw.url) {
    const headers = {}
    if (raw.headers && typeof raw.headers === 'object') {
      for (const k of Object.keys(raw.headers)) headers[k] = String(raw.headers[k])
    }
    return { name: serverName, source, config: { serverName, transport: 'streamable-http', url: String(raw.url), headers } }
  }
  return {
    name: String(name),
    source,
    error: type === 'sse' ? 'SSE transport is not supported by DSH (only stdio / streamable-http)' : 'unsupported MCP config',
  }
}

// ---------------------------------------------------------------------------
// Source scanners
// ---------------------------------------------------------------------------

async function scanCodex() {
  const result = { mcp: [], skills: [] }
  const tomlPath = join(HOME, '.codex', 'config.toml')
  const tomlText = await readText(tomlPath)
  if (tomlText) {
    try {
      const parsed = parseToml(tomlText)
      const servers = parsed.mcp_servers && typeof parsed.mcp_servers === 'object' ? parsed.mcp_servers : {}
      for (const name of Object.keys(servers)) {
        result.mcp.push({ name, source: 'codex', raw: servers[name], enabled: true })
      }
    } catch (e) {
      result.error = String((e && e.message) || e)
    }
  }
  result.skills = await scanSkillsDir(join(HOME, '.codex', 'skills'))
  return result
}

async function scanClaude() {
  const result = { mcp: [], skills: [] }
  const seenMcp = new Set()
  const claudeJson = await readText(join(HOME, '.claude.json'))
  if (claudeJson) {
    try {
      const j = JSON.parse(claudeJson)
      if (j && typeof j === 'object' && j.mcpServers && typeof j.mcpServers === 'object') {
        for (const name of Object.keys(j.mcpServers)) {
          result.mcp.push({ name, source: 'claude', raw: j.mcpServers[name], enabled: true })
          seenMcp.add(name)
        }
      }
    } catch { /* ignore malformed */ }
  }
  const settingsText = await readText(join(HOME, '.claude', 'settings.json'))
  if (settingsText) {
    try {
      const j = JSON.parse(settingsText)
      if (j && typeof j === 'object' && j.mcpServers && typeof j.mcpServers === 'object') {
        for (const name of Object.keys(j.mcpServers)) {
          if (seenMcp.has(name)) continue
          result.mcp.push({ name, source: 'claude', raw: j.mcpServers[name], enabled: true })
          seenMcp.add(name)
        }
      }
    } catch { /* ignore */ }
  }
  const pluginsRoot = join(HOME, '.claude', 'plugins')
  const mkts = await listDir(join(pluginsRoot, 'marketplaces'))
  for (const m of mkts) {
    result.skills.push(...await scanSkillsDir(join(pluginsRoot, 'marketplaces', m, 'skills')))
  }
  for (const d of await listDir(pluginsRoot)) {
    if (d === 'marketplaces') continue
    result.skills.push(...await scanSkillsDir(join(pluginsRoot, d, 'skills')))
  }
  result.skills.push(...await scanSkillsDir(join(HOME, '.claude', 'skills')))
  return result
}

function readCcswitchDb(dbPath) {
  const db = new DatabaseSync(dbPath, { readOnly: true })
  try {
    const servers = db.prepare(
      'SELECT id, name, server_config, enabled_claude, enabled_codex, enabled_gemini, enabled_opencode, enabled_hermes, enabled_grokbuild FROM mcp_servers',
    ).all()
    const skills = db.prepare(
      'SELECT id, name, description, directory, repo_owner, repo_name, enabled_claude, enabled_codex, enabled_gemini, enabled_opencode, enabled_hermes FROM skills',
    ).all()
    return { servers, skills }
  } finally {
    db.close()
  }
}

async function scanCcswitch() {
  const result = { mcp: [], skills: [] }
  const dbPath = join(HOME, '.cc-switch', 'cc-switch.db')
  if (await exists(dbPath)) {
    try {
      const data = readCcswitchDb(dbPath)
      if (Array.isArray(data.servers)) {
        for (const s of data.servers) {
          let cfg = {}
          try { cfg = JSON.parse(s.server_config || '{}') } catch { /* ignore */ }
          result.mcp.push({
            name: s.name || s.id,
            source: 'ccswitch',
            raw: cfg,
            enabled: {
              claude: !!s.enabled_claude, codex: !!s.enabled_codex, gemini: !!s.enabled_gemini,
              opencode: !!s.enabled_opencode, hermes: !!s.enabled_hermes,
            },
          })
        }
      }
      if (Array.isArray(data.skills)) {
        for (const sk of data.skills) {
          result.skills.push({
            name: sk.name || sk.id,
            description: sk.description || '',
            src: sk.directory || undefined,
            kind: 'bundle',
            repo: sk.repo_owner ? `${sk.repo_owner}/${sk.repo_name}` : undefined,
          })
        }
      }
    } catch (e) {
      result.error = String((e && e.message) || e)
    }
  }
  result.skills.push(...await scanSkillsDir(join(HOME, '.cc-switch', 'skills')))
  return result
}

// ---------------------------------------------------------------------------
// Generic MCP config extraction (JSON / YAML-ish / TOML) + extra agent sources
// ---------------------------------------------------------------------------

// Generic adapters: agent id -> candidate config files (JSON/YAML/TOML) and
// skills directories under $HOME. Adding a new agent is one registry entry.
const AGENT_DEFS = [
  { id: 'qoder', config: ['.qoder/mcp.json', '.qoder-cn/mcp.json', '.qoderwork/mcp.json', '.qoderworkcn/mcp.json'], skills: ['.qoder/skills', '.qoder-cn/skills', '.qoderwork/skills'] },
  { id: 'workbuddy', config: ['.workbuddy/.mcp.json', '.workbuddy/mcp.json', '.workbuddy/settings.json'], skills: ['.workbuddy/skills'] },
  { id: 'zcode', config: ['.zcode/config.json', '.zcode/setting.json', '.zcode/mcp.json'], skills: ['.zcode/skills'] },
  { id: 'lingma', config: ['.lingma/mcp.json', '.lingma/config.json'], skills: ['.lingma/skills'] },
  { id: 'codemoss', config: ['.codemoss/config.json', '.codemoss/mcp.json'], skills: ['.codemoss/skills'] },
  { id: 'copilot', config: ['.copilot/mcp.json', '.copilot/config.json'], skills: ['.copilot/skills'] },
  { id: 'cursor', config: ['.cursor/mcp.json'], skills: ['.cursor/skills'] },
  { id: 'windsurf', config: ['.codeium/windsurf/mcp_config.json', '.codeium/windsurf/settings.json'], skills: ['.codeium/windsurf/skills'] },
  { id: 'cline', config: ['.cline/mcp_settings.json', '.cline/mcp.json'], skills: ['.cline/skills'] },
  { id: 'roo', config: ['.roo/mcp_settings.json', '.roo/mcp.json'], skills: ['.roo/skills'] },
  { id: 'qwen', config: ['.codeqwen/mcp.json', '.codeqwen/config.json'], skills: ['.codeqwen/skills'] },
]

const ALL_SOURCES = [
  'codex', 'claude', 'ccswitch', 'hermes', 'opencode', 'gemini', 'grok',
  'kimi', 'codebuddy', 'trae', 'openclaw',
  ...AGENT_DEFS.map((d) => d.id),
  'custom',
]

function unquoteYaml(s) {
  s = String(s || '').trim()
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) return s.slice(1, -1)
  return s
}

// Minimal YAML extractor for the standard `mcpServers:` mapping shape
// ({ name: { command, args: [...], env: {...}, url, type } }).
function parseYamlMcp(text) {
  const servers = {}
  let section = null
  let current = null
  let currentField = null
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.replace(/\t/g, '  ')
    const indent = /^ */.exec(line)[0].length
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    if (indent === 0 && /^(mcpServers|mcp_servers|mcp):/.test(trimmed)) {
      section = trimmed.split(':')[0]
      current = null
      currentField = null
      continue
    }
    if (!section) continue
    if (indent === 2) {
      const m = /^([A-Za-z0-9_.-]+):\s*$/.exec(trimmed)
      if (m) { current = m[1]; servers[current] = {}; currentField = null; continue }
    }
    if (!current) continue
    const eq = trimmed.indexOf(':')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed.slice(eq + 1).trim()
    if (indent >= 4 && key === 'command') { servers[current].command = unquoteYaml(val); currentField = null; continue }
    if (indent >= 4 && key === 'url') { servers[current].url = unquoteYaml(val); currentField = null; continue }
    if (indent >= 4 && key === 'type') { servers[current].type = unquoteYaml(val); currentField = null; continue }
    if (indent >= 4 && key === 'cwd') { servers[current].cwd = unquoteYaml(val); currentField = null; continue }
    if (indent >= 4 && key === 'args') { currentField = 'args'; continue }
    if (indent >= 4 && key === 'env') { currentField = 'env'; continue }
    if (indent >= 4 && key === 'headers') { currentField = 'headers'; continue }
    if (currentField === 'args' && indent >= 6) {
      if (!servers[current].args) servers[current].args = []
      servers[current].args.push(unquoteYaml(trimmed.replace(/^- /, '')))
      continue
    }
    if ((currentField === 'env' || currentField === 'headers') && indent >= 6) {
      const e = trimmed.indexOf(':')
      if (e > 0) {
        const ek = trimmed.slice(0, e).trim()
        if (!servers[current][currentField]) servers[current][currentField] = {}
        servers[current][currentField][ek] = unquoteYaml(trimmed.slice(e + 1).trim())
      }
      continue
    }
    if (currentField && indent < 6) currentField = null
  }
  return servers
}

function extractMcpServers(text) {
  if (!text) return {}
  try {
    const j = JSON.parse(text)
    if (j && typeof j === 'object' && !Array.isArray(j)) {
      for (const key of ['mcpServers', 'mcp_servers', 'mcp']) {
        if (j[key] && typeof j[key] === 'object' && !Array.isArray(j[key])) return j[key]
      }
      if (j.command || j.url) return j
    }
    return {}
  } catch {
    return parseYamlMcp(text)
  }
}

function extractTomlMcp(parsed) {
  const out = {}
  const mcp = (parsed && parsed.mcp) || {}
  const servers = mcp.servers && typeof mcp.servers === 'object' ? mcp.servers : mcp
  if (servers && typeof servers === 'object') {
    for (const name of Object.keys(servers)) {
      const s = servers[name]
      if (s && typeof s === 'object' && (s.command || s.url)) out[name] = s
    }
  }
  return out
}

async function pushMcp(result, source, servers) {
  for (const name of Object.keys(servers)) {
    result.mcp.push({ name, source, raw: servers[name], enabled: true })
  }
}

async function scanHermes() {
  const result = { mcp: [], skills: [] }
  for (const f of ['config.yaml', 'config.yml', 'config.json']) {
    const text = await readText(join(HOME, '.hermes', f))
    if (text) { await pushMcp(result, 'hermes', extractMcpServers(text)); break }
  }
  result.skills = await scanSkillsDir(join(HOME, '.hermes', 'skills'))
  return result
}

async function scanOpencode() {
  const result = { mcp: [], skills: [] }
  for (const f of ['opencode.json', 'config.json']) {
    const text = await readText(join(HOME, '.config', 'opencode', f))
    if (text) { await pushMcp(result, 'opencode', extractMcpServers(text)); break }
  }
  result.skills = await scanSkillsDir(join(HOME, '.config', 'opencode', 'skills'))
  return result
}

async function scanGemini() {
  const result = { mcp: [], skills: [] }
  const text = await readText(join(HOME, '.gemini', 'settings.json'))
  if (text) await pushMcp(result, 'gemini', extractMcpServers(text))
  result.skills = await scanSkillsDir(join(HOME, '.gemini', 'skills'))
  return result
}

async function scanGrok() {
  const result = { mcp: [], skills: [] }
  for (const f of ['config.json', 'settings.json', 'mcp.json', 'config.yaml']) {
    const text = await readText(join(HOME, '.grok', f))
    if (text) { await pushMcp(result, 'grok', extractMcpServers(text)); break }
  }
  result.skills = await scanSkillsDir(join(HOME, '.grok', 'skills'))
  return result
}

async function scanKimi() {
  const result = { mcp: [], skills: [] }
  const cfgPath = join(HOME, '.kimi', 'config.toml')
  if (await exists(cfgPath)) {
    try { await pushMcp(result, 'kimi', extractTomlMcp(parseToml(await readText(cfgPath)))) }
    catch (e) { result.error = String((e && e.message) || e) }
  }
  result.skills = await scanSkillsDir(join(HOME, '.kimi', 'skills'))
  return result
}

async function scanCodebuddy() {
  const result = { mcp: [], skills: [] }
  const text = await readText(join(HOME, '.codebuddy', 'mcp.json'))
  if (text) await pushMcp(result, 'codebuddy', extractMcpServers(text))
  result.skills = await scanSkillsDir(join(HOME, '.codebuddy', 'skills'))
  return result
}

async function scanTrae() {
  const result = { mcp: [], skills: [] }
  const text = await readText(join(HOME, '.trae-cn', 'mcp.json'))
  if (text) await pushMcp(result, 'trae', extractMcpServers(text))
  result.skills = await scanSkillsDir(join(HOME, '.trae-cn', 'skills'))
  return result
}

async function scanOpenclaw() {
  const result = { mcp: [], skills: [] }
  for (const base of ['.openclaw', '.clawdbot']) {
    for (const f of ['config.yaml', 'config.yml', 'config.json']) {
      const text = await readText(join(HOME, base, f))
      if (text) { await pushMcp(result, 'openclaw', extractMcpServers(text)); break }
    }
    result.skills.push(...await scanSkillsDir(join(HOME, base, 'skills')))
  }
  return result
}

async function scanGenericAgent(def) {
  const result = { mcp: [], skills: [] }
  for (const rel of def.config) {
    const text = await readText(join(HOME, rel))
    if (text) await pushMcp(result, def.id, extractMcpServers(text))
  }
  for (const rel of def.skills) result.skills.push(...await scanSkillsDir(join(HOME, rel)))
  return result
}

async function readSources() {
  const text = await readText(SOURCES_FILE)
  if (!text) return []
  try {
    const j = JSON.parse(text)
    return Array.isArray(j) ? j : []
  } catch {
    return []
  }
}

async function writeSources(list) {
  await writeText(SOURCES_FILE, JSON.stringify(list, null, 2))
}

// ---------------------------------------------------------------------------
// Plugin config (skillSyncMode: copy | link, syncProfiles: all | desktop | web)
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG = { skillSyncMode: 'copy', syncProfiles: 'all' }
const CONFIG_FILE = join(DIR, 'config.json')

async function readConfig() {
  const text = await readText(CONFIG_FILE)
  if (!text) return { ...DEFAULT_CONFIG }
  try { return { ...DEFAULT_CONFIG, ...JSON.parse(text) } } catch { return { ...DEFAULT_CONFIG } }
}

async function writeConfig(cfg) {
  await writeText(CONFIG_FILE, JSON.stringify(cfg, null, 2))
}

async function setConfig(patch) {
  const cfg = await readConfig()
  if (patch && (patch.skillSyncMode === 'copy' || patch.skillSyncMode === 'link')) cfg.skillSyncMode = patch.skillSyncMode
  if (patch && (patch.syncProfiles === 'all' || patch.syncProfiles === 'desktop' || patch.syncProfiles === 'web')) cfg.syncProfiles = patch.syncProfiles
  await writeConfig(cfg)
  return cfg
}

async function symlinkDir(src, dst) {
  await symlink(src, dst, 'junction')
}

async function symlinkFile(src, dst) {
  await symlink(src, dst)
}

async function scanCustom() {
  const result = { mcp: [], skills: [] }
  const sources = await readSources()
  for (const s of sources) {
    try {
      if (s.kind === 'json') {
        const text = await readText(s.path)
        if (text) {
          const j = JSON.parse(text)
          const key = s.mcpKey || 'mcpServers'
          const servers = j && typeof j === 'object' ? (j[key] || {}) : {}
          for (const name of Object.keys(servers)) {
            result.mcp.push({ name, source: s.id, raw: servers[name], enabled: true })
          }
        }
      } else if (s.kind === 'toml') {
        const text = await readText(s.path)
        if (text) {
          const parsed = parseToml(text)
          const sec = s.section || 'mcp_servers'
          const servers = parsed[sec] && typeof parsed[sec] === 'object' ? parsed[sec] : {}
          for (const name of Object.keys(servers)) {
            result.mcp.push({ name, source: s.id, raw: servers[name], enabled: true })
          }
        }
      } else if (s.kind === 'dir') {
        for (const sk of await scanSkillsDir(s.path)) result.skills.push({ ...sk, source: s.id })
      }
    } catch (e) {
      result.error = (result.error || '') + `${s.id}: ${(e && e.message) || e}; `
    }
  }
  return result
}

async function scanFor(src) {
  switch (src) {
    case 'codex': return await scanCodex()
    case 'claude': return await scanClaude()
    case 'ccswitch': return await scanCcswitch()
    case 'hermes': return await scanHermes()
    case 'opencode': return await scanOpencode()
    case 'gemini': return await scanGemini()
    case 'grok': return await scanGrok()
    case 'kimi': return await scanKimi()
    case 'codebuddy': return await scanCodebuddy()
    case 'trae': return await scanTrae()
    case 'openclaw': return await scanOpenclaw()
    case 'custom': return await scanCustom()
    default: {
      const def = AGENT_DEFS.find((d) => d.id === src)
      if (def) return await scanGenericAgent(def)
      return { mcp: [], skills: [] }
    }
  }
}

async function scanAll(sources) {
  const wanted = new Set((sources && sources.length ? sources : ALL_SOURCES).map((s) => String(s).toLowerCase()))
  const out = {}
  for (const src of ALL_SOURCES) {
    if (wanted.has(src)) out[src] = await scanFor(src)
  }
  return out
}

// ---------------------------------------------------------------------------
// YAML patch writer (cordis.patch.yml)
// ---------------------------------------------------------------------------

function yamlStr(v) {
  let s = v === undefined || v === null ? '' : String(v)
  if (s.includes("'")) s = s.replace(/'/g, "''")
  return `'${s}'`
}

function renderManagedSection(entries) {
  const lines = [PATCH_MARK_START]
  if (!entries.length) {
    lines.push('- insert: []')
  } else {
    lines.push('- insert:')
    for (const e of entries) {
      lines.push(`    - id: ${e.entryId}`)
      lines.push("      name: '@deepseek-ai/dsh-mcp-client'")
      lines.push('      config:')
      lines.push(`        serverName: ${yamlStr(e.serverName)}`)
      lines.push(`        transport: ${yamlStr(e.config.transport)}`)
      if (e.config.transport === 'stdio') {
        lines.push(`        command: ${yamlStr(e.config.command)}`)
        if (e.config.args && e.config.args.length) {
          lines.push('        args:')
          for (const a of e.config.args) lines.push(`          - ${yamlStr(a)}`)
        }
        if (e.config.env && Object.keys(e.config.env).length) {
          lines.push('        env:')
          for (const k of Object.keys(e.config.env)) lines.push(`          ${yamlStr(k)}: ${yamlStr(e.config.env[k])}`)
        }
        if (e.config.cwd) lines.push(`        cwd: ${yamlStr(e.config.cwd)}`)
      } else {
        lines.push(`        url: ${yamlStr(e.config.url)}`)
        if (e.config.headers && Object.keys(e.config.headers).length) {
          lines.push('        headers:')
          for (const k of Object.keys(e.config.headers)) lines.push(`          ${yamlStr(k)}: ${yamlStr(e.config.headers[k])}`)
        }
      }
    }
  }
  lines.push(PATCH_MARK_END)
  return lines.join('\n')
}

function rebuildPatchText(text, entries) {
  const kept = []
  let inManaged = false
  for (const line of String(text || '').split(/\r?\n/)) {
    const t = line.trim()
    if (t === PATCH_MARK_START) { inManaged = true; continue }
    if (t === PATCH_MARK_END) { inManaged = false; continue }
    if (inManaged) continue
    if (t === '[]') continue // repair the dsh-skin flow-sequence bug
    kept.push(line)
  }
  while (kept.length && kept[kept.length - 1].trim() === '') kept.pop()
  const body = kept.join('\n').trim()
  const section = renderManagedSection(entries)
  return (body ? `${body}\n\n` : '') + section + '\n'
}

function externalMcpIds(text) {
  const ids = []
  let inManaged = false
  const re = /^- id:\s*(mcp-[A-Za-z0-9_-]+)\s*$/
  for (const line of String(text || '').split(/\r?\n/)) {
    const t = line.trim()
    if (t === PATCH_MARK_START) { inManaged = true; continue }
    if (t === PATCH_MARK_END) { inManaged = false; continue }
    if (inManaged) continue
    const m = re.exec(t)
    if (m) ids.push(m[1])
  }
  return ids
}

async function profilesWithPatch() {
  const names = await listDir(join(DSH_HOME, 'profiles'))
  const out = []
  for (const n of names) {
    const patchPath = join(DSH_HOME, 'profiles', n, 'cordis.patch.yml')
    if (await exists(patchPath)) out.push({ name: n, patchPath })
  }
  return out
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

async function readState() {
  const text = await readText(STATE_FILE)
  if (!text) return { mcp: {}, skills: {} }
  try { return JSON.parse(text) } catch { return { mcp: {}, skills: {} } }
}

async function writeState(state) {
  await writeText(STATE_FILE, JSON.stringify(state, null, 2))
}

function resolveSelection(list, keys) {
  if (!list || !list.length || list.includes('all')) return [...keys]
  return list.filter((k) => keys.includes(k))
}

// ---------------------------------------------------------------------------
// Sync operations
// ---------------------------------------------------------------------------

async function collectMcpCandidates(sources) {
  const scans = await scanAll(sources)
  const byName = new Map()
  const errors = []
  for (const src of ALL_SOURCES) {
    const items = (scans[src] && scans[src].mcp) || []
    for (const item of items) {
      const norm = normalizeMcp(item.name, item.raw, src)
      if (norm.error) {
        errors.push(`${src}/${item.name}: ${norm.error}`)
        continue
      }
      if (!byName.has(norm.name)) byName.set(norm.name, norm)
    }
  }
  return { byName, errors }
}

async function collectSkillCandidates(sources) {
  const scans = await scanAll(sources)
  const byName = new Map()
  for (const src of ALL_SOURCES) {
    const items = (scans[src] && scans[src].skills) || []
    for (const sk of items) {
      if (!sk.src) continue
      if (!byName.has(sk.name)) byName.set(sk.name, { ...sk, source: src })
    }
  }
  return byName
}

function enabledMcpEntries(state) {
  return Object.keys(state.mcp)
    .filter((n) => state.mcp[n].enabled !== false)
    .map((n) => ({ entryId: state.mcp[n].entryId, serverName: n, config: state.mcp[n].config }))
}

async function syncMcp(selected, opts = {}) {
  const state = await readState()
  const cand = await collectMcpCandidates(opts.sources)
  const names = resolveSelection(selected, [...cand.byName.keys()])
  const synced = []
  const skipped = []
  for (const name of names) {
    const item = cand.byName.get(name)
    if (!item) { skipped.push({ name, reason: 'not found in scanned sources' }); continue }
    const entryId = `mcp-${name}`
    state.mcp[name] = {
      source: item.source,
      entryId,
      config: item.config,
      enabled: state.mcp[name] ? state.mcp[name].enabled !== false : true,
      syncedAt: new Date().toISOString(),
    }
    synced.push(name)
  }
  const config = await readConfig()
  let profiles = await profilesWithPatch()
  if (opts.profile) profiles = profiles.filter((p) => p.name === opts.profile)
  else if (config.syncProfiles !== 'all') profiles = profiles.filter((p) => p.name === config.syncProfiles)
  const entries = enabledMcpEntries(state)
  const profileResults = []
  for (const p of profiles) {
    const text = await readText(p.patchPath)
    const external = externalMcpIds(text)
    const conflicts = synced.filter((n) => external.includes(`mcp-${n}`))
    if (conflicts.length) {
      profileResults.push({ profile: p.name, skippedConflicts: conflicts })
      continue
    }
    const next = rebuildPatchText(text, entries)
    if (next !== text) {
      await writeText(p.patchPath, next)
      profileResults.push({ profile: p.name, updated: true })
    } else {
      profileResults.push({ profile: p.name, updated: false })
    }
  }
  await writeState(state)
  return { synced, skipped, errors: cand.errors, profiles: profileResults }
}

async function syncSkills(selected, opts = {}) {
  const config = await readConfig()
  const state = await readState()
  const byName = await collectSkillCandidates(opts.sources)
  const names = resolveSelection(selected, [...byName.keys()])
  const scope = opts.scope || ''
  const skillsRoot = scope ? workspaceSkillRoot(scope) : join(DSH_HOME, 'skills')
  const synced = []
  const skipped = []
  for (const name of names) {
    const item = byName.get(name)
    if (!item) { skipped.push({ name, reason: 'not found in scanned sources' }); continue }
    const safe = sanitizeSkillName(item.name)
    const dst = item.kind === 'flat' ? join(skillsRoot, `${safe}.md`) : join(skillsRoot, safe)
    const existsDst = await exists(dst)
    if (existsDst && !opts.overwrite) {
      skipped.push({ name, reason: 'already exists in target skills dir (use overwrite: true)' })
      continue
    }
    if (existsDst) await removePath(dst)
    await mkdir(skillsRoot, { recursive: true })
    let mode = 'copy'
    try {
      if (config.skillSyncMode === 'link') {
        if (item.kind === 'flat') { await symlinkFile(item.src, dst) } else { await symlinkDir(item.src, dst) }
        mode = 'link'
      } else {
        await copyPath(item.src, dst)
      }
    } catch {
      await copyPath(item.src, dst)
      mode = 'copy'
    }
    state.skills[safe] = {
      source: item.source, src: item.src, dst, kind: item.kind, mode, scope,
      enabled: state.skills[safe] ? state.skills[safe].enabled !== false : true,
      syncedAt: new Date().toISOString(),
    }
    synced.push({ name: safe, dst, mode, scope })
  }
  await writeState(state)
  return { synced, skipped }
}

// 从本地文件/目录添加一个技能到指定作用域（全局或某工作区）。
async function addSkill(sourcePath, opts = {}) {
  const scope = opts.scope || ''
  const skillsRoot = scope ? workspaceSkillRoot(scope) : join(DSH_HOME, 'skills')
  const src = String(sourcePath || '').trim()
  if (!src) return { ok: false, error: 'source path is required' }
  let kind = null
  let name = null
  const md = join(src, 'SKILL.md')
  if (await exists(md)) {
    kind = 'bundle'
    const meta = parseSkillFrontmatter((await readText(md)) || '')
    name = meta.name
  } else if (src.toLowerCase().endsWith('.md')) {
    kind = 'flat'
    const meta = parseSkillFrontmatter((await readText(src)) || '')
    name = meta.name
  }
  if (!name) return { ok: false, error: 'not a valid skill (needs a directory with SKILL.md or a .md file with frontmatter)' }
  const safe = sanitizeSkillName(name)
  const dst = kind === 'flat' ? join(skillsRoot, `${safe}.md`) : join(skillsRoot, safe)
  await mkdir(skillsRoot, { recursive: true })
  if (await exists(dst)) return { ok: false, error: `skill already exists: ${safe}` }
  const config = await readConfig()
  let mode = 'copy'
  try {
    if (config.skillSyncMode === 'link') {
      if (kind === 'flat') { await symlinkFile(src, dst) } else { await symlinkDir(src, dst) }
      mode = 'link'
    } else {
      await copyPath(src, dst)
    }
  } catch {
    await copyPath(src, dst)
    mode = 'copy'
  }
  const state = await readState()
  state.skills[safe] = {
    source: 'manual', src, dst, kind, mode, scope, enabled: true,
    syncedAt: new Date().toISOString(),
  }
  await writeState(state)
  return { ok: true, name: safe, dst, mode, scope }
}

// 从浏览器上传的文件内容添加技能（folder → bundle，单 .md → flat）。
async function addSkillFiles(payload) {
  const scope = (payload && payload.scope) || ''
  const skillsRoot = scope ? workspaceSkillRoot(scope) : join(DSH_HOME, 'skills')
  const name = String((payload && payload.name) || '').trim()
  const kind = payload && payload.kind === 'flat' ? 'flat' : 'bundle'
  const files = Array.isArray(payload && payload.files) ? payload.files : []
  if (!name || !files.length) return { ok: false, error: 'name and files are required' }
  const safe = sanitizeSkillName(name)
  await mkdir(skillsRoot, { recursive: true })
  const dst = kind === 'flat' ? join(skillsRoot, `${safe}.md`) : join(skillsRoot, safe)
  if (await exists(dst)) return { ok: false, error: `skill already exists: ${safe}` }
  if (kind === 'flat') {
    await writeText(dst, String(files[0].content || ''))
  } else {
    let hasSkillMd = false
    for (const f of files) {
      const rel = String(f.path || '').replace(/^[\\/]+/, '').replace(/\\/g, '/')
      if (!rel) continue
      if (rel.toUpperCase() === 'SKILL.MD') hasSkillMd = true
      const out = join(dst, rel)
      await mkdir(dirname(out), { recursive: true })
      await writeText(out, String(f.content || ''))
    }
    if (!hasSkillMd) {
      await rm(dst, { recursive: true, force: true })
      return { ok: false, error: 'folder must contain SKILL.md' }
    }
  }
  const state = await readState()
  state.skills[safe] = {
    source: 'manual-upload', src: dst, dst, kind, mode: 'copy', scope, enabled: true,
    syncedAt: new Date().toISOString(),
  }
  await writeState(state)
  return { ok: true, name: safe, dst, scope }
}

function parseKeyValueLines(text) {
  const out = {}
  String(text || '').split(/\r?\n/).forEach((line) => {
    const eq = line.indexOf('=')
    if (eq > 0) {
      const k = line.slice(0, eq).trim()
      if (k) out[k] = line.slice(eq + 1).trim()
    }
  })
  return out
}

function parseHeaderLines(text) {
  const out = {}
  String(text || '').split(/\r?\n/).forEach((line) => {
    const c = line.indexOf(':')
    if (c > 0) {
      const k = line.slice(0, c).trim()
      if (k) out[k] = line.slice(c + 1).trim()
    }
  })
  return out
}

// 手动添加一个 MCP 服务器（写入 state + 各 profile 的 cordis.patch.yml）。
async function addMcp(payload) {
  const name = String((payload && payload.name) || '').trim()
  if (!name) return { ok: false, error: 'name is required' }
  let raw
  if (payload && (payload.transport === 'http' || payload.transport === 'streamable-http' || (payload.url && !payload.command))) {
    raw = { type: 'http', url: String(payload.url || '').trim(), headers: parseHeaderLines(payload.headers) }
  } else {
    raw = {
      type: 'stdio',
      command: String((payload && payload.command) || '').trim(),
      args: String((payload && payload.args) || '').trim().split(/\s+/).filter(Boolean),
      env: parseKeyValueLines(payload.env),
    }
  }
  if (!raw.command && !raw.url) return { ok: false, error: 'command (stdio) or url (http) is required' }
  const norm = normalizeMcp(name, raw, 'manual')
  if (norm.error) return { ok: false, error: norm.error }
  const state = await readState()
  if (state.mcp[norm.name]) return { ok: false, error: 'MCP server already exists: ' + norm.name }
  state.mcp[norm.name] = {
    source: 'manual', entryId: 'mcp-' + norm.name, config: norm.config, enabled: true,
    syncedAt: new Date().toISOString(),
  }
  await writeState(state)
  const entries = enabledMcpEntries(state)
  const profileResults = []
  for (const p of await profilesWithPatch()) {
    const text = await readText(p.patchPath)
    const next = rebuildPatchText(text, entries)
    if (next !== text) {
      await writeText(p.patchPath, next)
      profileResults.push({ profile: p.name, updated: true })
    } else {
      profileResults.push({ profile: p.name, updated: false })
    }
  }
  return { ok: true, name: norm.name, config: norm.config, profiles: profileResults }
}

// 迁移技能到另一作用域（全局或某工作区）：先复制到目标，成功后删除源（move）。
async function migrateSkill(payload) {
  const target = String((payload && payload.target) || '').trim()
  const names = Array.isArray(payload && payload.names)
    ? payload.names.map((n) => sanitizeSkillName(String(n || ''))).filter(Boolean)
    : []
  if (!names.length) return { ok: false, error: 'no skills selected' }
  const state = await readState()
  const targetRoot = target ? workspaceSkillRoot(target) : join(DSH_HOME, 'skills')
  const migrated = []
  const errors = []
  for (const safe of names) {
    const rec = state.skills[safe]
    if (!rec || !rec.dst) { errors.push(`${safe}: not a managed skill`); continue }
    const srcScope = rec.scope || ''
    if (srcScope === target) { errors.push(`${safe}: already in this scope`); continue }
    if (!(await exists(rec.dst))) { errors.push(`${safe}: source missing (${rec.dst})`); continue }
    const base = rec.kind === 'flat' ? `${safe}.md` : safe
    const targetDst = join(targetRoot, base)
    if (await exists(targetDst)) { errors.push(`${safe}: target already exists`); continue }
    await mkdir(targetRoot, { recursive: true })
    try {
      await copyPath(rec.dst, targetDst)
    } catch (e) {
      errors.push(`${safe}: copy failed — ${(e && e.message) || e}`)
      continue
    }
    await rm(rec.dst, { recursive: true, force: true })
    rec.dst = targetDst
    rec.scope = target
    migrated.push(safe)
  }
  await writeState(state)
  return { ok: migrated.length > 0, migrated, errors, target: target || '(global)' }
}

async function status(ctx) {
  const state = await readState()
  let skillProvider = 'unavailable'
  const skillsSvc = ctx ? ctx.get('skills') : undefined
  if (skillsSvc) {
    try {
      await skillsSvc.list()
      skillProvider = 'available'
    } catch { /* registry not available */ }
  }
  const disk = await listSkillsOnDisk()
  const dshSkills = disk.filter((s) => s.enabled).map((s) => ({ name: s.name, description: s.description, path: s.path, kind: s.kind }))
  const disabledSkills = disk.filter((s) => !s.enabled).map((s) => ({
    name: s.name,
    source: (state.skills[s.name] && state.skills[s.name].source) || 'user',
  }))
  const mcpInPatch = []
  for (const p of await profilesWithPatch()) {
    const text = await readText(p.patchPath)
    const ids = []
    const re = /- id: (mcp-[A-Za-z0-9_-]+)\s*\n\s*name: '@deepseek-ai\/dsh-mcp-client'/g
    let m
    while ((m = re.exec(text))) ids.push(m[1])
    mcpInPatch.push({ profile: p.name, entries: ids })
  }
  const disabledMcp = Object.keys(state.mcp)
    .filter((n) => state.mcp[n].enabled === false)
    .map((n) => ({ name: n, source: state.mcp[n].source }))
  const workspaces = await listWorkspaces(ctx)
  const workspaceSkills = []
  for (const ws of workspaces) {
    const disk = await listSkillsOnDisk(workspaceSkillRoot(ws.path))
    if (!disk.length) continue
    workspaceSkills.push({
      path: ws.path, label: ws.label,
      skills: disk.filter((s) => s.enabled).map((s) => ({ name: s.name, description: s.description, path: s.path, kind: s.kind })),
      disabled: disk.filter((s) => !s.enabled).map((s) => ({
        name: s.name,
        source: (state.skills[s.name] && state.skills[s.name].source) || 'user',
      })),
    })
  }
  return { dshSkills, mcpInPatch, disabledMcp, disabledSkills, skillProvider, state, sources: await readSources(), config: await readConfig(), workspaces, workspaceSkills }
}

async function setMcpEnabled(name, enabled) {
  const state = await readState()
  if (!state.mcp[name]) return { ok: false, error: `not a synced MCP server: ${name}` }
  state.mcp[name].enabled = !!enabled
  await writeState(state)
  const entries = enabledMcpEntries(state)
  const results = []
  for (const p of await profilesWithPatch()) {
    const text = await readText(p.patchPath)
    const next = rebuildPatchText(text, entries)
    if (next !== text) {
      await writeText(p.patchPath, next)
      results.push({ profile: p.name, updated: true })
    } else {
      results.push({ profile: p.name, updated: false })
    }
  }
  return { name, enabled: !!enabled, profiles: results }
}

async function setSkillEnabled(name, enabled) {
  const state = await readState()
  const safe = sanitizeSkillName(name)
  const rec = state.skills[safe]
  const skillsRoot = rec && rec.scope ? workspaceSkillRoot(rec.scope) : join(DSH_HOME, 'skills')
  if (rec && rec.mode === 'link') {
    // 软连接 skill：停用=移除 junction，启用=重建 junction
    if (enabled) {
      if (rec.dst && rec.src && !(await exists(rec.dst))) {
        try {
          if (rec.kind === 'flat') { await symlinkFile(rec.src, rec.dst) } else { await symlinkDir(rec.src, rec.dst) }
        } catch { /* ignore */ }
      }
      rec.enabled = true
    } else {
      if (rec.dst && (await exists(rec.dst))) await removePath(rec.dst)
      rec.enabled = false
    }
    await writeState(state)
    return { name: safe, enabled: !!enabled }
  }
  const dirPath = join(skillsRoot, safe)
  const md = join(dirPath, 'SKILL.md')
  const mdDisabled = join(dirPath, 'SKILL.md.disabled')
  const flat = join(skillsRoot, `${safe}.md`)
  const flatDisabled = join(skillsRoot, `${safe}.md.disabled`)
  let did = false
  if (enabled) {
    if (await exists(mdDisabled)) { await rename(mdDisabled, md); did = true }
    else if (await exists(flatDisabled)) { await rename(flatDisabled, flat); did = true }
  } else {
    if (await exists(md)) { await rename(md, mdDisabled); did = true }
    else if (await exists(flat)) { await rename(flat, flatDisabled); did = true }
  }
  if (!did) return { ok: false, error: `skill not found in ~/.dsh/skills: ${safe}` }
  if (state.skills[safe]) {
    state.skills[safe].enabled = !!enabled
  } else {
    state.skills[safe] = { source: 'user', enabled: !!enabled, syncedAt: new Date().toISOString() }
  }
  await writeState(state)
  return { name: safe, enabled: !!enabled }
}

async function removeMcp(name) {
  const state = await readState()
  if (state.mcp[name]) delete state.mcp[name]
  const entries = enabledMcpEntries(state)
  const results = []
  for (const p of await profilesWithPatch()) {
    const text = await readText(p.patchPath)
    const next = rebuildPatchText(text, entries)
    if (next !== text) {
      await writeText(p.patchPath, next)
      results.push({ profile: p.name, updated: true })
    } else {
      results.push({ profile: p.name, updated: false })
    }
  }
  await writeState(state)
  return { removed: name, profiles: results }
}

async function removeSkill(name) {
  const state = await readState()
  const safe = sanitizeSkillName(name)
  let dst = null
  if (state.skills[safe] && state.skills[safe].dst) {
    dst = state.skills[safe].dst
  } else {
    if (await exists(join(DSH_HOME, 'skills', safe))) dst = join(DSH_HOME, 'skills', safe)
    else if (await exists(join(DSH_HOME, 'skills', `${safe}.md`))) dst = join(DSH_HOME, 'skills', `${safe}.md`)
  }
  if (state.skills[safe]) delete state.skills[safe]
  if (dst && (await exists(dst))) await removePath(dst)
  await writeState(state)
  return { removed: safe, path: dst }
}

// ---------------------------------------------------------------------------
// Report shaping (no secrets: env/header values omitted, keys only)
// ---------------------------------------------------------------------------

function compactMcp(item) {
  const out = { name: item.name, source: item.source }
  const norm = item.config ? item : normalizeMcp(item.name, item.raw, item.source)
  if (norm.error) { out.error = norm.error; return out }
  const c = norm.config
  out.transport = c.transport
  if (c.transport === 'stdio') {
    out.command = c.command
    if (c.args && c.args.length) out.args = c.args
    const envKeys = Object.keys(c.env || {})
    if (envKeys.length) out.envKeys = envKeys
  } else {
    out.url = c.url
    const headerKeys = Object.keys(c.headers || {})
    if (headerKeys.length) out.headerKeys = headerKeys
  }
  return out
}

function compactScans(scans) {
  const out = {}
  for (const key of Object.keys(scans)) {
    const s = scans[key]
    out[key] = {
      mcp: (s.mcp || []).map(compactMcp),
      skills: (s.skills || []).map((sk) => {
        const o = { name: sk.name, description: sk.description, source: sk.source || key }
        if (sk.repo) o.repo = sk.repo
        return o
      }),
    }
    if (s.error) out[key].error = s.error
  }
  return out
}

// ---------------------------------------------------------------------------
// Tool registration
// ---------------------------------------------------------------------------

function textTool(def) {
  return defineTool({
    ...def,
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: String(value) }],
    },
    presentCall: (args) => ({
      card: 'generic',
      kind: 'other',
      title: def.name.replace(/_/g, ' '),
      rawInput: args,
    }),
  })
}

function registerTools(ctx) {
  ctx.tools.register(textTool({
    name: 'agent_sync_scan',
    description: "Discover MCP servers and skills from other AI agents on this machine and report what can be synced into DSH. Sources: codex, claude, ccswitch, hermes, opencode, gemini, grok, kimi, codebuddy, trae, openclaw, qoder, workbuddy, zcode, lingma, codemoss, copilot, cursor, windsurf, cline, roo, qwen (each reads that agent's user config + skills dir), and custom (defined via agent_sync_sources). Returns JSON grouped by source; env/header values are omitted (keys only) to avoid leaking secrets. Use before agent_sync_do.",
    parameters: {
      sources: { type: 'array', items: { type: 'string' }, description: 'Limit scan to these sources (codex | claude | ccswitch | custom). Omit for all.' },
    },
    execute: async (args) => JSON.stringify(compactScans(await scanAll(args.sources)), null, 2),
  }))

  ctx.tools.register(textTool({
    name: 'agent_sync_do',
    description: "Sync selected MCP servers and/or skills from other agents into DSH. MCP servers are written into each DSH profile's cordis.patch.yml as @deepseek-ai/dsh-mcp-client instances (the file is repaired if it was invalid). The desktop GUI shell composes its profile once at boot, so MCP entries activate on the next DSH Desktop restart; the dsh CLI/headless boot hot-applies profile patches via HMR. Skills are copied into <dshHome>/skills (global) or <workspace>/.dsh/skills when scope is a workspace path (or linked via junction when skillSyncMode=link) and are auto-discovered by sessions whose agent preset mounts the skill-filesystem provider. Pass mcp: [\"all\"] or server names, skills: [\"all\"] or skill names (as shown by agent_sync_scan). overwrite:true replaces an existing DSH skill with the same name. Returns a summary of synced/skipped items and which profile patch files were updated.",
    parameters: {
      mcp: { type: 'array', items: { type: 'string' }, description: 'MCP server names to sync (\"all\" = every discovered server).' },
      skills: { type: 'array', items: { type: 'string' }, description: 'Skill names to sync (\"all\" = every discovered skill).' },
      sources: { type: 'array', items: { type: 'string' }, description: 'Restrict scan to these sources.' },
      overwrite: { type: 'boolean', description: 'Overwrite an existing DSH skill with the same name. Default false.' },
      profile: { type: 'string', description: "Only write MCP entries into this profile's patch file (e.g. \"desktop\"). Default: all profiles." },
      scope: { type: 'string', description: 'Skill target scope: empty/global = <dshHome>/skills; or a workspace path = <workspace>/.dsh/skills.' },
    },
    execute: async (args) => {
      const mcp = args.mcp && args.mcp.length ? await syncMcp(args.mcp, { sources: args.sources, profile: args.profile }) : null
      const skills = args.skills && args.skills.length
        ? await syncSkills(args.skills, { sources: args.sources, overwrite: !!args.overwrite, scope: args.scope || '' })
        : null
      return JSON.stringify({ ok: true, mcp, skills }, null, 2)
    },
  }))

  ctx.tools.register(textTool({
    name: 'agent_sync_add_skill',
    description: 'Add a skill from a local file or directory into DSH. source: a directory containing SKILL.md (bundle) or a .md file with frontmatter (flat). scope: empty/global = <dshHome>/skills, or a workspace path = <workspace>/.dsh/skills. Uses config skillSyncMode (copy or link). Returns the added skill name, target path, mode and scope.',
    parameters: {
      source: { type: 'string', required: true, description: 'Absolute path to the skill directory (with SKILL.md) or .md file.' },
      scope: { type: 'string', description: 'Target scope: empty/global or a workspace path.' },
    },
    execute: async (args) => {
      try {
        return JSON.stringify(await addSkill(args.source, { scope: args.scope || '' }), null, 2)
      } catch (e) {
        return JSON.stringify({ ok: false, error: String((e && e.message) || e) })
      }
    },
  }))

  ctx.tools.register(textTool({
    name: 'agent_sync_status',
    description: "Show the current DSH-side state: MCP client entries present in each profile's cordis.patch.yml (in the desktop GUI these activate on the next DSH Desktop restart), the agent-sync state bookkeeping (which MCP/skills were synced from which source and when), configured custom sources, and skills discoverable in this session's scope.",
    parameters: {},
    execute: async () => JSON.stringify(await status(ctx), null, 2),
  }))

  ctx.tools.register(textTool({
    name: 'agent_sync_config',
    description: "Get or set the plugin configuration. action \"get\" returns { skillSyncMode: \"copy\"|\"link\", syncProfiles: \"all\"|\"desktop\"|\"web\" }. action \"set\" accepts skillSyncMode and/or syncProfiles and persists to <dshHome>/agent-sync/config.json. skillSyncMode controls how Skills are synced (copy = duplicate files, link = junction to the source dir so source updates are reflected live); syncProfiles controls which profile(s) MCP servers are written to. Stored in <dshHome>/agent-sync/config.json.",
    parameters: {
      action: { type: 'string', enum: ['get', 'set'], required: true, description: 'get | set' },
      skillSyncMode: { type: 'string', enum: ['copy', 'link'], description: 'Skill sync mode (set).' },
      syncProfiles: { type: 'string', enum: ['all', 'desktop', 'web'], description: 'MCP sync target profile(s) (set).' },
    },
    execute: async (args) => {
      try {
        return args.action === 'set'
          ? JSON.stringify({ ok: true, config: await setConfig(args) }, null, 2)
          : JSON.stringify({ ok: true, config: await readConfig() }, null, 2)
      } catch (e) {
        return JSON.stringify({ ok: false, error: String((e && e.message) || e) })
      }
    },
  }))

  ctx.tools.register(textTool({
    name: 'agent_sync_toggle',
    description: 'Enable or disable a synced MCP server or skill in DSH. type "mcp": toggles the mcp-<name> entry — disabled servers are excluded from every profile\'s cordis.patch.yml until re-enabled. type "skill": toggles the copied skill by renaming its SKILL.md to SKILL.md.disabled (or back), which hides it from DSH discovery. Pass the exact name shown by agent_sync_status. Returns the new enabled state.',
    parameters: {
      type: { type: 'string', enum: ['mcp', 'skill'], required: true, description: 'What to toggle: "mcp" or "skill".' },
      name: { type: 'string', required: true, description: 'Exact name of the synced item.' },
      enabled: { type: 'boolean', required: true, description: 'true to enable, false to disable.' },
    },
    execute: async (args) => {
      try {
        const out = args.type === 'skill'
          ? await setSkillEnabled(args.name, args.enabled)
          : await setMcpEnabled(args.name, args.enabled)
        return JSON.stringify({ ok: true, ...out }, null, 2)
      } catch (e) {
        return JSON.stringify({ ok: false, error: String((e && e.message) || e) })
      }
    },
  }))

  ctx.tools.register(textTool({
    name: 'agent_sync_remove',
    description: "Remove a previously synced item from DSH. type \"mcp\" removes the mcp-<name> entry from every profile's cordis.patch.yml; type \"skill\" deletes the copied skill directory/file from <dshHome>/skills. Pass the exact name shown by agent_sync_status.",
    parameters: {
      type: { type: 'string', enum: ['mcp', 'skill'], required: true, description: 'What to remove: "mcp" or "skill".' },
      name: { type: 'string', required: true, description: 'Exact name of the synced item.' },
    },
    execute: async (args) => {
      const out = args.type === 'skill' ? await removeSkill(args.name) : await removeMcp(args.name)
      return JSON.stringify({ ok: true, ...out }, null, 2)
    },
  }))

  ctx.tools.register(textTool({
    name: 'agent_sync_sources',
    description: 'Manage custom agent sources for scanning. action "list" returns the current sources. action "add" adds a source: {id, label, kind, path, mcpKey?, section?} where kind is "json" (path to a JSON file with an mcpServers-style object, key selectable via mcpKey, default "mcpServers"), "toml" (path to a TOML file whose MCP section is selected via section, default "mcp_servers"), or "dir" (path to a skills directory). action "delete" removes a source by id. Stored in <dshHome>/agent-sync/sources.json.',
    parameters: {
      action: { type: 'string', enum: ['list', 'add', 'delete'], required: true, description: 'list | add | delete' },
      id: { type: 'string', description: 'Source id (required for add and delete).' },
      label: { type: 'string', description: 'Human-readable label (for add).' },
      kind: { type: 'string', enum: ['json', 'toml', 'dir'], description: 'Source kind (for add).' },
      path: { type: 'string', description: 'Absolute path (for add).' },
      mcpKey: { type: 'string', description: 'JSON key holding the MCP server map (json kind, default "mcpServers").' },
      section: { type: 'string', description: 'TOML section holding the MCP server map (toml kind, default "mcp_servers").' },
    },
    execute: async (args) => {
      const list = await readSources()
      if (args.action === 'list') return JSON.stringify({ ok: true, sources: list }, null, 2)
      if (args.action === 'add') {
        if (!args.id || !args.kind || !args.path) return JSON.stringify({ ok: false, error: 'id, kind and path are required' })
        const idx = list.findIndex((s) => s.id === args.id)
        const entry = { id: args.id, label: args.label || args.id, kind: args.kind, path: args.path }
        if (args.mcpKey) entry.mcpKey = args.mcpKey
        if (args.section) entry.section = args.section
        if (idx >= 0) list[idx] = entry; else list.push(entry)
        await writeSources(list)
        return JSON.stringify({ ok: true, sources: list }, null, 2)
      }
      if (args.action === 'delete') {
        const next = list.filter((s) => s.id !== args.id)
        await writeSources(next)
        return JSON.stringify({ ok: true, sources: next }, null, 2)
      }
      return JSON.stringify({ ok: false, error: 'unknown action' })
    },
  }))
}

// ---------------------------------------------------------------------------
// Client-facing HTTP routes (used by the browser panel; web profile only)
// ---------------------------------------------------------------------------

function json(res, data, status = 200) {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify(data))
}

async function readBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  if (!chunks.length) return {}
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { return {} }
}

async function readArgs(req) {
  if (req.method === 'POST') return await readBody(req)
  const url = new URL(req.url, 'http://localhost')
  const out = {}
  for (const [k, v] of url.searchParams) out[k] = v
  if (out.sources) out.sources = out.sources.split(',').map((s) => s.trim()).filter(Boolean)
  if (out.mcp) out.mcp = out.mcp.split(',').map((s) => s.trim()).filter(Boolean)
  if (out.skills) out.skills = out.skills.split(',').map((s) => s.trim()).filter(Boolean)
  if (out.overwrite) out.overwrite = out.overwrite === 'true'
  return out
}

function registerRoutes(ctx) {
  const webServer = ctx.get('webServer')
  if (!webServer) return []
  const disposers = []
  const route = (path, handler) => disposers.push(webServer.register({ name: `dsh-agent-sync:${path}`, kind: 'exact', path, handler }))

  route('/dsh-agent-sync/scan', async (req, res) => {
    try { json(res, compactScans(await scanAll((await readArgs(req)).sources))) }
    catch (e) { json(res, { ok: false, error: String((e && e.message) || e) }, 500) }
  })

  route('/dsh-agent-sync/status', async (req, res) => {
    try { json(res, await status(ctx)) }
    catch (e) { json(res, { ok: false, error: String((e && e.message) || e) }, 500) }
  })

  route('/dsh-agent-sync/sync', async (req, res) => {
    try {
      const a = await readArgs(req)
      const mcp = a.mcp && a.mcp.length ? await syncMcp(a.mcp, { sources: a.sources, profile: a.profile }) : null
      const skills = a.skills && a.skills.length
        ? await syncSkills(a.skills, { sources: a.sources, overwrite: !!a.overwrite, scope: a.scope || '' })
        : null
      json(res, { ok: true, mcp, skills })
    } catch (e) { json(res, { ok: false, error: String((e && e.message) || e) }, 500) }
  })

  route('/dsh-agent-sync/add-skill', async (req, res) => {
    try {
      const a = await readArgs(req)
      json(res, await addSkill(a.path, { scope: a.scope || '' }))
    } catch (e) { json(res, { ok: false, error: String((e && e.message) || e) }, 500) }
  })

  route('/dsh-agent-sync/add-skill-files', async (req, res) => {
    try {
      const a = await readArgs(req)
      json(res, await addSkillFiles(a))
    } catch (e) { json(res, { ok: false, error: String((e && e.message) || e) }, 500) }
  })

  route('/dsh-agent-sync/migrate-skill', async (req, res) => {
    try {
      const a = await readArgs(req)
      json(res, await migrateSkill(a))
    } catch (e) { json(res, { ok: false, error: String((e && e.message) || e) }, 500) }
  })

  route('/dsh-agent-sync/add-mcp', async (req, res) => {
    try {
      const a = await readArgs(req)
      json(res, await addMcp(a))
    } catch (e) { json(res, { ok: false, error: String((e && e.message) || e) }, 500) }
  })

  route('/dsh-agent-sync/remove', async (req, res) => {
    try {
      const a = await readArgs(req)
      json(res, a.type === 'skill' ? await removeSkill(a.name) : await removeMcp(a.name))
    } catch (e) { json(res, { ok: false, error: String((e && e.message) || e) }, 500) }
  })

  route('/dsh-agent-sync/config', async (req, res) => {
    try {
      const a = await readArgs(req)
      json(res, a.action === 'set' ? await setConfig(a) : await readConfig())
    } catch (e) { json(res, { ok: false, error: String((e && e.message) || e) }, 500) }
  })

  route('/dsh-agent-sync/toggle', async (req, res) => {
    try {
      const a = await readArgs(req)
      json(res, a.type === 'skill' ? await setSkillEnabled(a.name, a.enabled) : await setMcpEnabled(a.name, a.enabled))
    } catch (e) { json(res, { ok: false, error: String((e && e.message) || e) }, 500) }
  })

  route('/dsh-agent-sync/sources', async (req, res) => {
    try {
      const a = await readArgs(req)
      const list = await readSources()
      if (a.action === 'add' && a.id && a.kind && a.path) {
        const idx = list.findIndex((s) => s.id === a.id)
        const entry = { id: a.id, label: a.label || a.id, kind: a.kind, path: a.path }
        if (a.mcpKey) entry.mcpKey = a.mcpKey
        if (a.section) entry.section = a.section
        if (idx >= 0) list[idx] = entry; else list.push(entry)
        await writeSources(list)
      } else if (a.action === 'delete') {
        await writeSources(list.filter((s) => s.id !== a.id))
      }
      json(res, await readSources())
    } catch (e) { json(res, { ok: false, error: String((e && e.message) || e) }, 500) }
  })

  return disposers
}

// ---------------------------------------------------------------------------
// Plugin entry
// ---------------------------------------------------------------------------

export function apply(ctx) {
  const disposers = []

  try {
    registerTools(ctx)
    // webServer exists only under the web profile and may not be ready at
    // apply time — register routes reactively like other web plugins.
    ctx.inject(['webServer'], (scope) => {
      disposers.push(...registerRoutes(scope))
    })
  } catch (error) {
    ctx.logger.warn(`dsh-agent-sync: ${error?.stack || error}`)
  }

  return () => {
    for (const d of disposers) {
      try { d() } catch { /* already disposed */ }
    }
  }
}
