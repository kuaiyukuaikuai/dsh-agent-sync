// dsh-agent-sync — browser panel (Settings → MCP/Skills)
// Lazy-CJS, zero build. All data/actions go through the host's HTTP routes under /dsh-agent-sync/*.
// 说明：本插件不依赖任何组件库——纯 React（React.createElement）+ DSH 主题变量（--dsw-alias-*）
// 自绘卡片、开关与弹窗，与 DSH 插件市场风格一致。
window.__ModuleLoader__.load({
  id: 'dsh-agent-sync',
  factory: function (require) {
    'use strict'
    var module = { exports: {} }
    var exports = module.exports
    var React = require('react')

    var CSS = '' +
        '.ags-panel{font-size:13px;line-height:1.5;color:var(--dsw-alias-label-primary,#1f2328);max-width:900px}' +
        '.ags-h{font-weight:600;margin:10px 0 4px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}' +
        '.ags-title{font-size:16px;font-weight:500;line-height:24px}' +
        '.ags-sub{color:var(--dsw-alias-label-tertiary,#8b93a1);font-size:12px}' +
        '.ags-sec{background:var(--dsw-alias-bg-layer-1,#ffffff);border:1px solid var(--dsw-alias-border-l1,#e5e7eb);border-radius:8px;padding:10px 12px;margin:8px 0}' +
        '.ags-btn{font:inherit;color:var(--dsw-alias-label-primary,#1f2328);background:color-mix(in srgb,var(--dsw-alias-border-l2,#d9dde3) 15%,transparent);border:1px solid var(--dsw-alias-border-l2,#d9dde3);border-radius:999px;padding:2px 12px;font-size:12px;line-height:1.6;cursor:pointer;margin-right:6px}' +
        '.ags-btn:hover{border-color:var(--dsw-alias-brand-primary,#4f6ef7);color:var(--dsw-alias-brand-primary,#4f6ef7)}' +
        '.ags-btn:disabled{opacity:.5;cursor:default}' +
        '.ags-btn-primary{border-color:var(--dsw-alias-brand-primary,#4f6ef7);color:var(--dsw-alias-brand-primary,#4f6ef7)}' +
        '.ags-btn-primary:hover{background:var(--dsw-alias-brand-primary,#4f6ef7);color:#fff}' +
        '.ags-tabs{display:flex;gap:6px;margin:4px 0;flex-wrap:wrap}' +
        '.ags-switchbar{display:flex;justify-content:center;gap:6px;margin:6px 0 10px}' +
        '.ags-tab{font:inherit;color:var(--dsw-alias-label-secondary,#6b7280);cursor:pointer;white-space:nowrap;background:color-mix(in srgb,var(--dsw-alias-border-l2,#d9dde3) 22%,transparent);border:1px solid transparent;border-radius:999px;padding:2px 10px;font-size:12px;line-height:1.6}' +
        '.ags-tab:hover{border-color:var(--dsw-alias-border-l2,#d9dde3)}' +
        '.ags-tab-active{background:var(--dsw-alias-brand-primary,#4f6ef7);border-color:var(--dsw-alias-brand-primary,#4f6ef7);color:#fff;font-weight:600}' +
        '.ags-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:8px;margin-top:6px}' +
        '.ags-card{border:none;border-radius:10px;padding:8px 10px;display:flex;flex-direction:column;gap:4px;background:var(--dsw-alias-bg-layer-1,#ffffff);cursor:pointer;box-shadow:0 1px 3px rgba(15,20,30,.08)}' +
        '.ags-card:hover{box-shadow:0 2px 8px rgba(15,20,30,.14);transform:translateY(-1px)}' +
        '.ags-card.ags-off{opacity:.55}' +
        '.ags-card-head{display:flex;align-items:center;justify-content:space-between;gap:6px}' +
        '.ags-name{font-weight:500;flex:0 0 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
        '.ags-card-meta{font-size:12px;color:var(--dsw-alias-label-tertiary,#8b93a1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}' +
        '.ags-card-desc{font-size:12px;color:var(--dsw-alias-label-secondary,#6b7280);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:32px}' +
        '.ags-card-foot{display:flex;align-items:center;justify-content:space-between;gap:4px;border-top:1px dashed var(--dsw-alias-border-l1,#eceef1);padding-top:4px;margin-top:2px}' +
        '.ags-tag{border:1px solid var(--dsw-alias-border-l2,#d9dde3);color:var(--dsw-alias-label-secondary,#6b7280);border-radius:4px;flex:0 0 auto;padding:1px 6px;font-size:11px;line-height:16px}' +
        '.ags-badge{font-size:11px;line-height:16px;border-radius:4px;padding:0 6px;flex:0 0 auto;white-space:nowrap}' +
        '.ags-badge-on{background:rgba(22,163,74,.12);color:var(--dsw-alias-state-success-primary,#16a34a)}' +
        '.ags-badge-off{background:rgba(220,38,38,.1);color:var(--dsw-alias-state-error-primary,#dc2626)}' +
        '.ags-badge-link{background:rgba(79,110,247,.12);color:var(--dsw-alias-brand-primary,#4f6ef7)}' +
        '.ags-switch{display:inline-flex;align-items:center;cursor:pointer;flex:0 0 auto}' +
        '.ags-switch-track{width:34px;height:18px;border-radius:999px;background:var(--dsw-alias-border-l2,#d9dde3);position:relative;transition:background .15s;border:1px solid var(--dsw-alias-border-l2,#d9dde3)}' +
        '.ags-switch.on .ags-switch-track{background:var(--dsw-alias-brand-primary,#4f6ef7);border-color:var(--dsw-alias-brand-primary,#4f6ef7)}' +
        '.ags-switch-knob{position:absolute;top:1px;left:1px;width:14px;height:14px;border-radius:50%;background:#fff;transition:left .15s;box-shadow:0 1px 2px rgba(0,0,0,.2)}' +
        '.ags-switch.on .ags-switch-knob{left:17px}' +
        '.ags-empty{color:var(--dsw-alias-label-tertiary,#8b93a1);font-style:italic;padding:6px 0;font-size:12px}' +
        '.ags-msg{white-space:pre-wrap;font-size:12px;color:var(--dsw-alias-label-secondary,#6b7280);max-height:140px;overflow:auto;margin-top:8px;border-top:1px dashed var(--dsw-alias-border-l2,#d9dde3);padding-top:6px}' +
        '.ags-err{color:var(--dsw-alias-state-error-primary,#dc2626)}' +
        '.ags-ok{color:var(--dsw-alias-state-success-primary,#16a34a)}' +
        '.ags-foot{margin-top:8px;padding-top:8px;border-top:1px solid var(--dsw-alias-border-l1,#eceef1);display:flex;align-items:center;flex-wrap:wrap;gap:4px}' +
        '.ags-in{font:inherit;color:var(--dsw-alias-label-primary,#1f2328);background:color-mix(in srgb,var(--dsw-alias-border-l2,#d9dde3) 10%,transparent);border:1px solid var(--dsw-alias-border-l2,#d9dde3);border-radius:999px;padding:2px 10px;font-size:12px;line-height:1.6;margin:2px 4px 2px 0}' +
        '.ags-in:focus{outline:none;border-color:var(--dsw-alias-brand-primary,#4f6ef7)}' +
        '.ags-label{font-size:11px;color:var(--dsw-alias-label-secondary,#6b7280);margin-right:2px}' +
        '.ags-checkall{font-size:12px;display:flex;align-items:center;gap:4px;cursor:pointer;user-select:none;color:var(--dsw-alias-label-secondary,#6b7280);margin-left:12px}' +
        '.ags-modal{position:fixed;inset:0;background:rgba(15,20,30,.4);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px}' +
        '.ags-modal-box{background:var(--dsw-alias-bg-layer-1,#ffffff);border:1px solid var(--dsw-alias-border-l2,#d9dde3);border-radius:10px;max-width:660px;width:100%;max-height:80vh;overflow:auto;padding:14px 16px}' +
        '.ags-modal-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}' +
        '.ags-modal-body{display:flex;flex-direction:column;gap:6px}' +
        '.ags-drow{display:flex;gap:10px;border-bottom:1px dashed var(--dsw-alias-border-l1,#eceef1);padding:4px 0}' +
        '.ags-drow:last-child{border-bottom:none}' +
        '.ags-dkey{flex:0 0 96px;color:var(--dsw-alias-label-tertiary,#8b93a1);font-size:12px;line-height:1.6}' +
        '.ags-dval{flex:1 1 auto;font-size:12px;line-height:1.6;word-break:break-all;white-space:pre-wrap;min-width:0}'

    var styleInjected = false
    function ensureStyles() {
      if (styleInjected) return
      styleInjected = true
      var style = document.createElement('style')
      style.dataset.plugin = 'dsh-agent-sync'
      style.textContent = CSS
      document.head.appendChild(style)
    }

  var h = React.createElement
  var SOURCE_LABELS = { codex: 'Codex', claude: 'Claude Code', ccswitch: 'cc-switch', hermes: 'Hermes', opencode: 'opencode', gemini: 'Gemini', grok: 'Grok', kimi: 'Kimi', codebuddy: 'CodeBuddy', trae: 'Trae', openclaw: 'OpenClaw', qoder: 'Qoder', workbuddy: 'WorkBuddy', zcode: 'Zcode', lingma: '通义灵码', codemoss: 'CodeMoss', copilot: 'Copilot', cursor: 'Cursor', windsurf: 'Windsurf', cline: 'Cline', roo: 'Roo Code', qwen: 'Qwen Code', custom: '自定义' }
  var TAB_KEYS = ['all', 'codex', 'claude', 'ccswitch', 'hermes', 'opencode', 'gemini', 'grok', 'kimi', 'codebuddy', 'trae', 'openclaw', 'qoder', 'workbuddy', 'zcode', 'lingma', 'codemoss', 'copilot', 'cursor', 'windsurf', 'cline', 'roo', 'qwen', 'custom']
  var MAIN_TABS = ['all', 'ccswitch', 'claude', 'codex', 'hermes', 'openclaw', 'opencode', 'custom']
  var MORE_TABS = ['cline', 'codebuddy', 'codemoss', 'copilot', 'cursor', 'gemini', 'kimi', 'qoder', 'qwen', 'roo', 'trae', 'windsurf', 'workbuddy', 'zcode', 'lingma']

  function call(method, args) {
    return fetch('/dsh-agent-sync/' + method, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(args || {}),
    }).then(function (res) { return res.json() })
  }

  function summarize(res) {
    if (!res) return ''
    var parts = []
    var m = res.mcp
    if (m) parts.push('MCP: ' + (m.synced && m.synced.length ? m.synced.join(', ') : '无') + (m.skipped && m.skipped.length ? '；跳过 ' + m.skipped.length : ''))
    var s = res.skills
    if (s) parts.push('Skill: ' + (s.synced && s.synced.length ? s.synced.map(function (x) { return x.name }).join(', ') : '无') + (s.skipped && s.skipped.length ? '；跳过 ' + s.skipped.length : ''))
    return parts.join('  ')
  }

  function buildMerged(data) {
    var mcp = {}
    var skills = {}
    for (var ti = 1; ti < TAB_KEYS.length; ti++) {
      var key = TAB_KEYS[ti]
      var src = (data && data[key]) || {}
      for (var i = 0; i < (src.mcp || []).length; i++) {
        var m = src.mcp[i]
        var baseM = mcp[m.name] || (mcp[m.name] = Object.assign({}, m, { sources: [] }))
        if (baseM.sources.indexOf(key) < 0) baseM.sources.push(key)
      }
      for (var j = 0; j < (src.skills || []).length; j++) {
        var sk = src.skills[j]
        var baseS = skills[sk.name] || (skills[sk.name] = Object.assign({}, sk, { sources: [] }))
        if (baseS.sources.indexOf(key) < 0) baseS.sources.push(key)
      }
    }
    return { mcp: Object.values(mcp), skills: Object.values(skills) }
  }

  function ToggleSwitch(checked, onChange) {
    return h('label', { className: 'ags-switch' + (checked ? ' on' : ''), title: checked ? '点击停用' : '点击启用' },
      h('input', { type: 'checkbox', checked: !!checked, onChange: function (e) { onChange(!!e.target.checked) }, style: { display: 'none' } }),
      h('span', { className: 'ags-switch-track' }, h('span', { className: 'ags-switch-knob' })))
  }

  function Panel(props) {
    var state = React.useState({})
    var view = state[0].view || 'main'
    var data = state[0].data
    var stat = state[0].stat
    var sources = state[0].sources || []
    var tab = state[0].tab || 'all'
    var moreOpen = !!state[0].moreOpen
    var syncTab = state[0].syncTab || 'mcp'
    var profTab = state[0].profTab || ''
    var stTab = state[0].stTab || 'mcp'
    var loading = state[0].loading !== false
    var busy = !!state[0].busy
    var msg = state[0].msg || ''
    var selMcp = state[0].selMcp || {}
    var selSkill = state[0].selSkill || {}
    var form = state[0].form || { id: '', label: '', kind: 'dir', path: '', mcpKey: '', section: '' }
    var overrides = state[0].overrides || {}
    var detail = state[0].detail || null
    var cfg = state[0].cfg || null
    var cfgDraft = state[0].cfgDraft || { skillSyncMode: 'copy', syncProfiles: 'all' }
    var showCfg = !!state[0].showCfg
    var syncScope = state[0].syncScope || ''
    var skillScope = state[0].skillScope || 'global'
    var skillSearch = state[0].skillSearch || ''
    var showAdd = !!state[0].showAdd
    var addPath = state[0].addPath || ''
    var addScope = state[0].addScope || ''
    var setState = state[1]
    var upd = function (patch) { setState(function (s) { return Object.assign({}, s, patch) }) }
    function overrideKey(type, name) { return type + ':' + name }
    function getEnabled(type, name, fallback) {
      var k = overrideKey(type, name)
      return k in overrides ? overrides[k] : !!fallback
    }
    function setOverride(type, name, enabled) {
      var k = overrideKey(type, name)
      upd({ overrides: Object.assign({}, overrides, { [k]: enabled }) })
    }

    function loadAll() {
      upd({ loading: true })
      Promise.all([
        call('scan', {}),
        call('status', {}),
        call('sources', { action: 'list' }),
        call('config', { action: 'get' }),
      ]).then(function (r) {
        var c = r[3] || null
        upd({
          data: r[0], stat: r[1], sources: Array.isArray(r[2]) ? r[2] : [],
          cfg: c, cfgDraft: c ? { skillSyncMode: c.skillSyncMode || 'copy', syncProfiles: c.syncProfiles || 'all' } : cfgDraft,
          loading: false,
        })
      }).catch(function (e) { upd({ msg: '加载失败: ' + String((e && e.message) || e), loading: false }) })
    }

    React.useEffect(function () { loadAll() }, [])

    var merged = buildMerged(data)
    var allMcp = merged.mcp
    var allSkills = merged.skills
    var visibleMcp = tab === 'all' ? allMcp : allMcp.filter(function (m) { return m.sources.indexOf(tab) >= 0 })
    var visibleSkills = tab === 'all' ? allSkills : allSkills.filter(function (s) { return s.sources.indexOf(tab) >= 0 })

    function tabCount(t) {
      return t === 'all'
        ? allMcp.length + allSkills.length
        : allMcp.filter(function (m) { return m.sources.indexOf(t) >= 0 }).length + allSkills.filter(function (s) { return s.sources.indexOf(t) >= 0 }).length
    }

    var allMcpChecked = visibleMcp.length > 0 && visibleMcp.every(function (m) { return selMcp[m.name] })
    var allSkillChecked = visibleSkills.length > 0 && visibleSkills.every(function (s) { return selSkill[s.name] })
    function toggleAllMcp() {
      var next = Object.assign({}, selMcp)
      var value = !allMcpChecked
      for (var i = 0; i < visibleMcp.length; i++) next[visibleMcp[i].name] = value
      upd({ selMcp: next })
    }
    function toggleAllSkill() {
      var next = Object.assign({}, selSkill)
      var value = !allSkillChecked
      for (var i = 0; i < visibleSkills.length; i++) next[visibleSkills[i].name] = value
      upd({ selSkill: next })
    }

    function runSync(mcpNames, skillNames, overwrite, scope) {
      upd({ busy: true, msg: '' })
      call('sync', { mcp: mcpNames, skills: skillNames, overwrite: !!overwrite, scope: scope || '' }).then(function (res) {
        upd({ msg: '同步完成 ✓ ' + summarize(res), busy: false })
        loadAll()
      }).catch(function (e) { upd({ msg: '同步失败: ' + String((e && e.message) || e), busy: false }) })
    }

    function removeItem(type, name) {
      call('remove', { type: type, name: name }).then(function () {
        upd({ msg: '已移除 ' + name })
        loadAll()
      }).catch(function (e) { upd({ msg: '移除失败: ' + String((e && e.message) || e) }) })
    }

    function toggleItem(type, name, enabled) {
      call('toggle', { type: type, name: name, enabled: enabled }).then(function () {
        // 只更新本地覆盖状态：卡片原地变色，不重排；下次刷新/重开才按已停用置底
        setOverride(type, name, enabled)
        upd({ msg: (enabled ? '已启用 ' : '已停用 ') + name })
      }).catch(function (e) { upd({ msg: '操作失败: ' + String((e && e.message) || e) }) })
    }

    function skillModeOf(name) {
      var rec = stat && stat.state && stat.state.skills && stat.state.skills[name]
      return rec && rec.mode ? rec.mode : 'copy'
    }

    function openSettings() {
      upd({ cfgDraft: { skillSyncMode: (cfg && cfg.skillSyncMode) || 'copy', syncProfiles: (cfg && cfg.syncProfiles) || 'all' }, showCfg: true })
    }

    function saveSettings() {
      call('config', { action: 'set', skillSyncMode: cfgDraft.skillSyncMode, syncProfiles: cfgDraft.syncProfiles }).then(function (c) {
        upd({ cfg: c, showCfg: false, msg: '配置已保存（下次同步生效）' })
        loadAll()
      }).catch(function (e) { upd({ msg: '保存失败: ' + String((e && e.message) || e) }) })
    }

    function addSource() {
      var a = { action: 'add', id: form.id, label: form.label, kind: form.kind, path: form.path }
      if (form.mcpKey) a.mcpKey = form.mcpKey
      if (form.section) a.section = form.section
      call('sources', a).then(function (list) {
        upd({ sources: Array.isArray(list) ? list : [], msg: '自定义源已保存', form: { id: '', label: '', kind: 'dir', path: '', mcpKey: '', section: '' } })
      }).catch(function (e) { upd({ msg: '保存失败: ' + String((e && e.message) || e) }) })
    }

    function delSource(id) {
      call('sources', { action: 'delete', id: id }).then(function (list) {
        upd({ sources: Array.isArray(list) ? list : [], msg: '已删除 ' + id })
      }).catch(function (e) { upd({ msg: '删除失败: ' + String((e && e.message) || e) }) })
    }

    function chk(checked, onChange) {
      return h('input', { type: 'checkbox', checked: checked, onChange: function (e) { onChange(e.target.checked) }, style: { margin: 0 } })
    }

    function sourceTags(list) {
      return (list || []).map(function (s) {
        return h('span', { key: 'src-' + s, className: 'ags-tag' }, SOURCE_LABELS[s] || s)
      })
    }

    var profTabs = []
    if (stat && stat.mcpInPatch) {
      for (var pi = 0; pi < stat.mcpInPatch.length; pi++) {
        var p = stat.mcpInPatch[pi]
        profTabs.push({
          name: p.profile,
          mcp: (p.entries || []).map(function (id) { return id.replace(/^mcp-/, '') }),
        })
      }
    }
    var dshSkillList = (stat && stat.dshSkills) || []
    var workspaces = (stat && stat.workspaces) || []
    var workspaceSkills = (stat && stat.workspaceSkills) || []
    var disabledMcp = (stat && stat.disabledMcp) || []
    var disabledSkills = (stat && stat.disabledSkills) || []
    var skillProvider = stat && stat.skillProvider
    var activeCard = profTabs.filter(function (q) { return q.name === 'desktop' })[0] || profTabs[0] || null

    var sourceRows = sources.map(function (s) {
      return h('div', { key: 'src-' + s.id, className: 'ags-row' },
        h('span', { className: 'ags-name' }, s.id),
        h('span', { className: 'ags-tag' }, s.kind),
        h('span', { className: 'ags-meta' }, s.path),
        h('button', { className: 'ags-btn', onClick: function () { delSource(s.id) } }, '删除'))
    })

    var selectedMcp = allMcp.filter(function (m) { return selMcp[m.name] }).map(function (m) { return m.name })
    var selectedSkill = allSkills.filter(function (s) { return selSkill[s.name] }).map(function (s) { return s.name })

    function input(labelText, key, ph, small) {
      return h('span', null,
        h('span', { className: 'ags-label' }, labelText),
        h('input', { className: 'ags-in', style: small ? { width: 60 } : {}, placeholder: ph, value: form[key] || '', onChange: function (e) { upd({ form: Object.assign({}, form, { [key]: e.target.value }) }) } }))
    }

    var msgClass = msg ? (msg.indexOf('失败') >= 0 ? ' ags-err' : msg.indexOf('✓') >= 0 ? ' ags-ok' : '') : ''

    function stop(e) { if (e && e.stopPropagation) e.stopPropagation() }
    function openDetail(type, item) { upd({ detail: { type: type, item: item } }) }
    function closeDetail() { upd({ detail: null }) }

    // 可同步列表：卡片 + 勾选（点击卡片看详情；来源只在详情页显示）
    var syncMcpCards = visibleMcp.map(function (m) {
      return h('div', { key: 'mcp-card-' + m.name, className: 'ags-card', onClick: function () { openDetail('mcp', m) } },
        h('div', { className: 'ags-card-head' },
          h('span', { className: 'ags-name', style: { flex: '1 1 auto' } }, m.name),
          h('span', { className: 'ags-tag' }, m.transport || '?')),
        h('div', { className: 'ags-card-meta' }, (m.command || m.url || '') + (m.error ? ' (' + m.error + ')' : '')),
        h('div', { className: 'ags-card-foot' },
          h('label', { onClick: stop }, chk(!!selMcp[m.name], function (v) { upd({ selMcp: Object.assign({}, selMcp, { [m.name]: v }) }) }))))
    })
    var syncSkillCards = visibleSkills.map(function (s) {
      return h('div', { key: 'skill-card-' + s.name, className: 'ags-card', onClick: function () { openDetail('skill', s) } },
        h('div', { className: 'ags-card-head' },
          h('span', { className: 'ags-name', style: { flex: '1 1 auto' } }, s.name),
          h('span', { className: 'ags-tag' }, 'skill')),
        h('div', { className: 'ags-card-desc' }, String(s.description || '')),
        h('div', { className: 'ags-card-foot' },
          h('label', { onClick: stop }, chk(!!selSkill[s.name], function (v) { upd({ selSkill: Object.assign({}, selSkill, { [s.name]: v }) }) }))))
    })

    function mcpMeta(name) {
      var st = stat && stat.state && stat.state.mcp && stat.state.mcp[name]
      var c = st && st.config
      if (!c) return ''
      return c.transport === 'stdio' ? (c.command || '') : (c.url || '')
    }
    function mcpCfg(name) {
      return stat && stat.state && stat.state.mcp && stat.state.mcp[name] && stat.state.mcp[name].config
    }
    function mcpSrc(name) {
      return (stat && stat.state && stat.state.mcp && stat.state.mcp[name] && stat.state.mcp[name].source) || ''
    }
    var manMcpCards = (activeCard ? activeCard.mcp : []).map(function (name) {
      var on = getEnabled('mcp', name, true)
      return h('div', { key: 'man-mcp-' + name, className: 'ags-card' + (on ? '' : ' ags-off'), onClick: function () { openDetail('mcp', { name: name, source: mcpSrc(name), config: mcpCfg(name) }) } },
        h('div', { className: 'ags-card-head' },
          h('span', { className: 'ags-name', style: { flex: '1 1 auto' } }, 'mcp-' + name),
          h('span', { className: 'ags-badge' + (on ? ' ags-badge-on' : ' ags-badge-off') }, on ? '启用' : '已停用')),
        h('div', { className: 'ags-card-meta' }, mcpMeta(name) || 'stdio'),
        h('div', { className: 'ags-card-foot' },
          h('button', { className: 'ags-btn', onClick: function (e) { stop(e); removeItem('mcp', name) } }, '移除'),
          h('label', { onClick: stop }, ToggleSwitch(on, function (v) { toggleItem('mcp', name, v) }))))
    })
    var manMcpDisabledCards = disabledMcp.map(function (m) {
      var on = getEnabled('mcp', m.name, false)
      return h('div', { key: 'man-mcp-off-' + m.name, className: 'ags-card' + (on ? '' : ' ags-off'), onClick: function () { openDetail('mcp', { name: m.name, source: m.source || '', config: mcpCfg(m.name) }) } },
        h('div', { className: 'ags-card-head' },
          h('span', { className: 'ags-name', style: { flex: '1 1 auto' } }, 'mcp-' + m.name),
          h('span', { className: 'ags-badge' + (on ? ' ags-badge-on' : ' ags-badge-off') }, on ? '启用' : '已停用')),
        h('div', { className: 'ags-card-meta' }, mcpMeta(m.name) || 'stdio'),
        h('div', { className: 'ags-card-foot' },
          h('button', { className: 'ags-btn', onClick: function (e) { stop(e); removeItem('mcp', m.name) } }, '移除'),
          h('label', { onClick: stop }, ToggleSwitch(on, function (v) { toggleItem('mcp', m.name, v) }))))
    })
    var manSkillCards = dshSkillList.map(function (sk) {
      var on = getEnabled('skill', sk.name, true)
      var mode = skillModeOf(sk.name)
      return h('div', { key: 'man-skill-' + sk.name, className: 'ags-card' + (on ? '' : ' ags-off'), onClick: function () { openDetail('skill', sk) } },
        h('div', { className: 'ags-card-head' },
          h('span', { className: 'ags-name', style: { flex: '1 1 auto' } }, sk.name),
          h('span', { className: 'ags-badge' + (mode === 'link' ? ' ags-badge-link' : (on ? ' ags-badge-on' : ' ags-badge-off')) }, mode === 'link' ? '🔗 软连接' : (on ? '启用' : '已停用'))),
        h('div', { className: 'ags-card-desc' }, String(sk.description || '')),
        h('div', { className: 'ags-card-foot' },
          h('button', { className: 'ags-btn', onClick: function (e) { stop(e); removeItem('skill', sk.name) } }, '移除'),
          h('label', { onClick: stop }, ToggleSwitch(on, function (v) { toggleItem('skill', sk.name, v) }))))
    })
    var manSkillDisabledCards = disabledSkills.map(function (s) {
      var on = getEnabled('skill', s.name, false)
      var mode = skillModeOf(s.name)
      return h('div', { key: 'man-skill-off-' + s.name, className: 'ags-card' + (on ? '' : ' ags-off'), onClick: function () { openDetail('skill', { name: s.name, description: '', source: s.source }) } },
        h('div', { className: 'ags-card-head' },
          h('span', { className: 'ags-name', style: { flex: '1 1 auto' } }, s.name),
          h('span', { className: 'ags-badge' + (mode === 'link' ? ' ags-badge-link' : ' ags-badge-off') }, mode === 'link' ? '🔗 软连接' : '已停用')),
        h('div', { className: 'ags-card-desc' }, mode === 'link' ? '(软连接已移除，启用后重新链接)' : '(已停用，SKILL.md 已改名 .disabled)'),
        h('div', { className: 'ags-card-foot' },
          h('button', { className: 'ags-btn', onClick: function (e) { stop(e); removeItem('skill', s.name) } }, '移除'),
          h('label', { onClick: stop }, ToggleSwitch(on, function (v) { toggleItem('skill', s.name, v) }))))
    })

    // 详情弹窗
    var detailRows = []
    if (detail) {
      function pushRow(k, v) {
        if (v !== undefined && v !== null && v !== '') detailRows.push(h('div', { key: k, className: 'ags-drow' }, h('span', { className: 'ags-dkey' }, k), h('span', { className: 'ags-dval' }, String(v))))
      }
      if (detail.type === 'mcp') {
        var it = detail.item
        var srcListM = (it.sources && it.sources.length ? it.sources : (it.source ? [it.source] : []))
        pushRow('名称', it.name)
        pushRow('来源', srcListM.join(', '))
        pushRow('传输方式', it.transport || '?')
        if (it.config) {
          var c = it.config
          pushRow('命令', c.command)
          pushRow('参数', Array.isArray(c.args) && c.args.length ? c.args.join(' ') : '')
          pushRow('URL', c.url)
          pushRow('环境变量(键)', c.env ? Object.keys(c.env).join(', ') : '')
          pushRow('Headers(键)', c.headers ? Object.keys(c.headers).join(', ') : '')
        } else {
          pushRow('命令', it.command)
          pushRow('参数', Array.isArray(it.args) && it.args.length ? it.args.join(' ') : '')
          pushRow('URL', it.url)
          pushRow('环境变量(键)', it.envKeys && it.envKeys.length ? it.envKeys.join(', ') : '')
          pushRow('Headers(键)', it.headerKeys && it.headerKeys.length ? it.headerKeys.join(', ') : '')
        }
        pushRow('错误', it.error)
      } else {
        var s = detail.item
        var srcListS = (s.sources && s.sources.length ? s.sources : (s.source ? [s.source] : []))
        pushRow('名称', s.name)
        pushRow('来源', srcListS.join(', '))
        pushRow('描述', s.description)
        pushRow('仓库', s.repo)
        pushRow('路径', s.path)
      }
    }
    var detailModal = detail
      ? h('div', { className: 'ags-modal', onClick: function () { closeDetail() } },
          h('div', { className: 'ags-modal-box', onClick: function (e) { stop(e) } },
            h('div', { className: 'ags-modal-head' },
              h('span', { className: 'ags-title' }, detail.type === 'mcp' ? 'MCP 详情' : 'Skill 详情'),
              h('button', { className: 'ags-btn', onClick: function () { closeDetail() } }, '✕ 关闭')),
            h('div', { className: 'ags-modal-body' }, detailRows)))
      : null

    var settingsModal = showCfg
      ? h('div', { className: 'ags-modal', onClick: function () { upd({ showCfg: false }) } },
          h('div', { className: 'ags-modal-box', onClick: function (e) { stop(e) } },
            h('div', { className: 'ags-modal-head' },
              h('span', { className: 'ags-title' }, '插件设置'),
              h('button', { className: 'ags-btn', onClick: function () { upd({ showCfg: false }) } }, '✕ 关闭')),
            h('div', { className: 'ags-modal-body' },
              h('div', { className: 'ags-drow' },
                h('span', { className: 'ags-dkey' }, 'Skill 同步方式'),
                h('div', { className: 'ags-dval' },
                  h('select', { className: 'ags-in', value: cfgDraft.skillSyncMode, onChange: function (e) { upd({ cfgDraft: Object.assign({}, cfgDraft, { skillSyncMode: e.target.value }) }) } },
                    h('option', { value: 'copy' }, '文件复制（默认）'),
                    h('option', { value: 'link' }, '软连接（链接源目录，实时同步）')),
                  h('div', { className: 'ags-sub', style: { marginTop: 2 } }, 'copy=复制到 ~/.dsh/skills；link=创建 junction 指向源目录，源更新即同步，不占双份空间'))),
              h('div', { className: 'ags-drow' },
                h('span', { className: 'ags-dkey' }, 'MCP 同步目标'),
                h('div', { className: 'ags-dval' },
                  h('select', { className: 'ags-in', value: cfgDraft.syncProfiles, onChange: function (e) { upd({ cfgDraft: Object.assign({}, cfgDraft, { syncProfiles: e.target.value }) }) } },
                    h('option', { value: 'all' }, '全部 profile（desktop + web）'),
                    h('option', { value: 'desktop' }, '仅 desktop'),
                    h('option', { value: 'web' }, '仅 web')))),
              h('div', { className: 'ags-foot' },
                h('button', { className: 'ags-btn ags-btn-primary', onClick: function () { saveSettings() } }, '保存')))))
      : null

    function gearBtn() {
      return h('button', { className: 'ags-btn', title: '插件设置', onClick: function () { openSettings() } }, '⚙️ 设置')
    }

    var syncBody = syncTab === 'mcp'
      ? h('div', null,
          h('div', { className: 'ags-foot', style: { borderTop: 'none', marginTop: 0, paddingTop: 0, marginBottom: 6 } },
            h('label', { className: 'ags-checkall' }, chk(allMcpChecked, function () { toggleAllMcp() }), '全选本页'),
            h('span', { style: { flex: '1 1 auto' } }),
            h('button', { className: 'ags-btn ags-btn-primary', disabled: busy || !selectedMcp.length, onClick: function () { runSync(selectedMcp, [], false) } }, '同步选中 MCP')),
          syncMcpCards.length ? h('div', { className: 'ags-grid' }, syncMcpCards) : h('div', { className: 'ags-empty' }, '该来源暂无 MCP 服务器'))
      : h('div', null,
          h('div', { className: 'ags-foot', style: { borderTop: 'none', marginTop: 0, paddingTop: 0, marginBottom: 6 } },
            h('label', { className: 'ags-checkall' }, chk(allSkillChecked, function () { toggleAllSkill() }), '全选本页'),
            h('span', { style: { flex: '1 1 auto' } }),
            h('span', { className: 'ags-label' }, '同步到'),
            h('select', { className: 'ags-in', value: syncScope, onChange: function (e) { upd({ syncScope: e.target.value }) } },
              h('option', { value: '' }, '全局 (~/.dsh/skills)'),
              workspaces.map(function (ws) {
                return h('option', { key: 'sc-' + ws.path, value: ws.path }, '工作区: ' + ws.label)
              })),
            h('button', { className: 'ags-btn ags-btn-primary', disabled: busy || !selectedSkill.length, onClick: function () { runSync([], selectedSkill, false, syncScope) } }, '同步选中 Skill'),
            h('button', { className: 'ags-btn', disabled: busy || !selectedSkill.length, onClick: function () { runSync([], selectedSkill, true, syncScope) } }, '覆盖同步')),
          syncSkillCards.length ? h('div', { className: 'ags-grid' }, syncSkillCards) : h('div', { className: 'ags-empty' }, '该来源暂无 skill'))

    // 文件读取 / 上传到宿主
    function readFileAsText(file) {
      return new Promise(function (resolve, reject) {
        var r = new FileReader()
        r.onload = function () { resolve(r.result) }
        r.onerror = reject
        r.readAsText(file)
      })
    }

    function uploadSkillFiles(kind, files, scope) {
      var name = ''
      var skillMd = files.filter(function (x) { return /(^|\/)SKILL\.md$/i.test(x.path) })[0]
      if (skillMd) {
        var m = /^---[\s\S]*?^name:\s*["']?([^"'\s]+)/m.exec(skillMd.content)
        if (m) name = m[1]
      }
      if (!name && kind === 'flat' && files[0]) {
        name = files[0].path.replace(/\.md$/i, '').split(/[\\/]/).pop()
      }
      if (!name && files[0]) {
        name = files[0].path.split(/[\\/]/)[0]
      }
      if (!name) { upd({ msg: '添加失败: 无法识别技能名' }); return }
      call('add-skill-files', { name: name, kind: kind, scope: scope || '', files: files }).then(function (r) {
        upd({ msg: r && r.ok ? ('已添加技能 ' + r.name) : ('添加失败: ' + (r && r.error)), showAdd: false })
        loadAll()
      }).catch(function (e) { upd({ msg: '添加失败: ' + String((e && e.message) || e) }) })
    }

    function onPickFolder(e) {
      var fileList = e.target.files
      if (!fileList || !fileList.length) return
      var files = []
      var reads = []
      for (var i = 0; i < fileList.length; i++) {
        ;(function (f) {
          reads.push(readFileAsText(f).then(function (content) {
            files.push({ path: f.webkitRelativePath || f.name, content: content })
          }))
        })(fileList[i])
      }
      Promise.all(reads).then(function () { uploadSkillFiles('bundle', files, addScope) })
      e.target.value = ''
    }

    function onPickFile(e) {
      var f = e.target.files && e.target.files[0]
      if (!f) return
      readFileAsText(f).then(function (content) {
        uploadSkillFiles('flat', [{ path: f.name, content: content }], addScope)
      })
      e.target.value = ''
    }

    function addSkillLocal() {
      call('add-skill', { path: addPath, scope: addScope }).then(function (r) {
        upd({ msg: r && r.ok ? ('已添加技能 ' + r.name) : ('添加失败: ' + (r && r.error)), addPath: '', showAdd: false })
        loadAll()
      }).catch(function (e) { upd({ msg: '添加失败: ' + String((e && e.message) || e) }) })
    }

    var addSkillModal = showAdd
      ? h('div', { className: 'ags-modal', onClick: function () { upd({ showAdd: false }) } },
          h('div', { className: 'ags-modal-box', onClick: function (e) { stop(e) } },
            h('div', { className: 'ags-modal-head' },
              h('span', { className: 'ags-title' }, '添加技能'),
              h('button', { className: 'ags-btn', onClick: function () { upd({ showAdd: false }) } }, '✕ 关闭')),
            h('div', { className: 'ags-modal-body' },
              h('div', { className: 'ags-drow' },
                h('span', { className: 'ags-dkey' }, '添加到'),
                h('div', { className: 'ags-dval' },
                  h('select', { className: 'ags-in', value: addScope, onChange: function (e) { upd({ addScope: e.target.value }) } },
                    h('option', { value: '' }, '全局'),
                    workspaces.map(function (ws) {
                      return h('option', { key: 'ad-' + ws.path, value: ws.path }, '工作区: ' + ws.label)
                    })))),
              h('div', { className: 'ags-drow' },
                h('span', { className: 'ags-dkey' }, '选择来源'),
                h('div', { className: 'ags-dval' },
                  h('label', { className: 'ags-btn ags-btn-primary', style: { display: 'inline-block', cursor: 'pointer', marginRight: 8 } },
                    '📁 选择文件夹',
                    h('input', { type: 'file', webkitdirectory: '', directory: '', style: { display: 'none' }, onChange: function (e) { onPickFolder(e) } })),
                  h('label', { className: 'ags-btn', style: { display: 'inline-block', cursor: 'pointer' } },
                    '📄 选择单个 .md',
                    h('input', { type: 'file', accept: '.md,text/markdown', style: { display: 'none' }, onChange: function (e) { onPickFile(e) } }))),
              h('div', { className: 'ags-foot' },
                h('span', { className: 'ags-sub' }, '文件夹需包含 SKILL.md（目录束）；单文件需为带 frontmatter 的 .md'))))))
      : null

    // 主面板 Skills：按作用域分组显示（全局 / 工作区）
    function manCardsFor(list, disabledList) {
      return list.map(function (sk) {
        var on = getEnabled('skill', sk.name, true)
        var mode = skillModeOf(sk.name)
        return h('div', { key: 'man-skill-' + (skillScope === 'global' ? 'g-' : 'w-') + sk.name, className: 'ags-card' + (on ? '' : ' ags-off'), onClick: function () { openDetail('skill', sk) } },
          h('div', { className: 'ags-card-head' },
            h('span', { className: 'ags-name', style: { flex: '1 1 auto' } }, sk.name),
            h('span', { className: 'ags-badge' + (mode === 'link' ? ' ags-badge-link' : (on ? ' ags-badge-on' : ' ags-badge-off')) }, mode === 'link' ? '🔗 软连接' : (on ? '启用' : '已停用'))),
          h('div', { className: 'ags-card-desc' }, String(sk.description || '')),
          h('div', { className: 'ags-card-foot' },
            h('button', { className: 'ags-btn', onClick: function (e) { stop(e); removeItem('skill', sk.name) } }, '移除'),
            h('label', { onClick: stop }, ToggleSwitch(on, function (v) { toggleItem('skill', sk.name, v) }))))
      }).concat(disabledList.map(function (s) {
        var on = getEnabled('skill', s.name, false)
        var mode = skillModeOf(s.name)
        return h('div', { key: 'man-skill-off-' + (skillScope === 'global' ? 'g-' : 'w-') + s.name, className: 'ags-card' + (on ? '' : ' ags-off'), onClick: function () { openDetail('skill', { name: s.name, description: '', source: s.source }) } },
          h('div', { className: 'ags-card-head' },
            h('span', { className: 'ags-name', style: { flex: '1 1 auto' } }, s.name),
            h('span', { className: 'ags-badge' + (mode === 'link' ? ' ags-badge-link' : ' ags-badge-off') }, mode === 'link' ? '🔗 软连接' : '已停用')),
          h('div', { className: 'ags-card-desc' }, mode === 'link' ? '(软连接已移除，启用后重新链接)' : '(已停用，SKILL.md 已改名 .disabled)'),
          h('div', { className: 'ags-card-foot' },
            h('button', { className: 'ags-btn', onClick: function (e) { stop(e); removeItem('skill', s.name) } }, '移除'),
            h('label', { onClick: stop }, ToggleSwitch(on, function (v) { toggleItem('skill', s.name, v) }))))
      }))
    }

    var activeWs = workspaceSkills.filter(function (w) { return w.path === skillScope })[0] || null
    var q = String(skillSearch || '').trim().toLowerCase()
    function filterSkills(list) {
      if (!q) return list
      return list.filter(function (s) {
        return String(s.name || '').toLowerCase().indexOf(q) >= 0 || String(s.description || '').toLowerCase().indexOf(q) >= 0
      })
    }
    var skillScopeCards = skillScope === 'global'
      ? manCardsFor(filterSkills(dshSkillList), filterSkills(disabledSkills))
      : (activeWs ? manCardsFor(filterSkills(activeWs.skills || []), filterSkills(activeWs.disabled || [])) : [])

    var statusBody = stTab === 'mcp'
      ? h('div', null,
          (manMcpCards.length || manMcpDisabledCards.length)
            ? h('div', { className: 'ags-grid' }, manMcpCards.concat(manMcpDisabledCards))
            : h('div', { className: 'ags-empty' }, '暂无已同步的 MCP'))
      : h('div', null,
          h('div', { className: 'ags-tabs' },
            h('button', { className: 'ags-tab' + (skillScope === 'global' ? ' ags-tab-active' : ''), onClick: function () { upd({ skillScope: 'global' }) } }, '全局 (' + dshSkillList.length + ')'),
            workspaces.map(function (ws) {
              var wse = workspaceSkills.filter(function (w) { return w.path === ws.path })[0]
              var n = (wse ? wse.skills.length + wse.disabled.length : 0)
              return h('button', { key: 'ws-' + ws.path, className: 'ags-tab' + (skillScope === ws.path ? ' ags-tab-active' : ''), onClick: function () { upd({ skillScope: ws.path }) } },
                '📁 ' + ws.label + ' (' + n + ')')
            }),
            h('span', { style: { flex: '1 1 auto' } }),
            h('input', { className: 'ags-in', style: { maxWidth: 200 }, placeholder: '🔍 搜索技能…', value: skillSearch, onChange: function (e) { upd({ skillSearch: e.target.value }) } })
          ),
          skillScopeCards.length
            ? h('div', { className: 'ags-grid' }, skillScopeCards)
            : h('div', { className: 'ags-empty' }, skillScope === 'global' ? '暂无已同步的 skill' : '该工作区暂无 skill'))

    // 主界面：DSH 现状（可启停）置顶
    var mainView = h('div', null,
      h('div', { className: 'ags-h' },
        h('span', { className: 'ags-title' }, 'MCP/Skills 管理'),
        h('button', { className: 'ags-btn', onClick: function () { loadAll() }, disabled: loading }, loading ? '加载中…' : '🔄 刷新'),
        gearBtn(),
        h('span', { className: 'ags-sub' }, skillProvider === 'unavailable' ? '（当前会话未挂载 skill 提供方，模型暂不可用，文件已就位）' : '启停 / 移除已同步到 DSH 的 MCP 与 skill'),
        h('button', { className: 'ags-btn ags-btn-primary', style: { marginLeft: 'auto' }, onClick: function () { upd({ view: 'sync' }) } }, 'MCP/Skills同步 →')),
      h('div', { className: 'ags-sec', style: { border: 'none', boxShadow: 'none', background: 'transparent', padding: 0 } },
        h('div', { className: 'ags-switchbar' },
          h('button', { className: 'ags-tab' + (stTab === 'mcp' ? ' ags-tab-active' : ''), onClick: function () { upd({ stTab: 'mcp' }) } }, 'MCP'),
          h('button', { className: 'ags-tab' + (stTab === 'skills' ? ' ags-tab-active' : ''), onClick: function () { upd({ stTab: 'skills' }) } }, 'Skills')
        ),
        activeCard ? statusBody : h('div', { className: 'ags-empty' }, '暂无 profile 数据')))

    // 同步页：从其他 agent 同步（按钮进入）
    var syncView = h('div', null,
      h('div', { className: 'ags-h' },
        h('button', { className: 'ags-btn', onClick: function () { upd({ view: 'main' }) } }, '← 返回'),
        h('span', { className: 'ags-title' }, 'MCP/Skills同步'),
        h('button', { className: 'ags-btn', onClick: function () { loadAll() }, disabled: loading }, loading ? '加载中…' : '🔄 刷新'),
        gearBtn(),
        h('span', { className: 'ags-sub' }, '从其他 agent 一键同步 MCP 与 skill 进 DSH'),
        h('button', { className: 'ags-btn ags-btn-primary', style: { marginLeft: 'auto' }, onClick: function () { upd({ showAdd: true, addScope: syncScope }) } }, '＋ 添加技能')),
      (function () {
        var moreActive = moreOpen || MORE_TABS.indexOf(tab) >= 0
        function tabBtn(t) {
          return h('button', { key: t, className: 'ags-tab' + (tab === t ? ' ags-tab-active' : ''), onClick: function () { upd({ tab: t }); if (MAIN_TABS.indexOf(t) >= 0) upd({ moreOpen: false }) } },
            (t === 'all' ? '全部' : SOURCE_LABELS[t] || t) + ' (' + tabCount(t) + ')')
        }
        return [
          h('div', { className: 'ags-tabs' },
            MAIN_TABS.map(tabBtn),
            h('button', { key: 'more', className: 'ags-tab' + (moreActive ? ' ags-tab-active' : ''), onClick: function () { upd({ moreOpen: !moreOpen }) } }, '更多 ▾')),
          moreActive ? h('div', { className: 'ags-tabs' }, MORE_TABS.map(tabBtn)) : null,
        ]
      })(),
      h('div', { className: 'ags-sec' },
        h('div', { className: 'ags-tabs' },
          h('button', { className: 'ags-tab' + (syncTab === 'mcp' ? ' ags-tab-active' : ''), onClick: function () { upd({ syncTab: 'mcp' }) } }, '可同步的 MCP (' + visibleMcp.length + ')'),
          h('button', { className: 'ags-tab' + (syncTab === 'skills' ? ' ags-tab-active' : ''), onClick: function () { upd({ syncTab: 'skills' }) } }, '可同步的 Skills (' + visibleSkills.length + ')')
        ),
        syncBody),
      h('div', { className: 'ags-sec' },
        h('div', { className: 'ags-h', style: { marginTop: 0 } }, '自定义源 (' + sources.length + ')'),
        sourceRows.length ? sourceRows : h('div', { className: 'ags-empty' }, '无自定义源'),
        h('div', { style: { marginTop: 4 } },
          input('ID', 'id', 'source-id'),
          input('名称', 'label', 'label'),
          h('span', null,
            h('span', { className: 'ags-label' }, '类型'),
            h('select', { className: 'ags-in', value: form.kind, onChange: function (e) { upd({ form: Object.assign({}, form, { kind: e.target.value }) }) } },
              h('option', { value: 'dir' }, '目录 (skills)'),
              h('option', { value: 'json' }, 'JSON (mcpServers)'),
              h('option', { value: 'toml' }, 'TOML (mcp_servers)'))),
          input('路径', 'path', '绝对路径', true),
          input('key', 'mcpKey', 'mcpServers'),
          input('section', 'section', 'mcp_servers'),
          h('button', { className: 'ags-btn ags-btn-primary', disabled: !form.id || !form.path, onClick: addSource }, '添加'))))

    return h('div', { className: 'ags-panel' },
      view === 'main' ? mainView : syncView,
      msg ? h('div', { className: 'ags-msg' + msgClass }, msg) : null,
      detailModal,
      settingsModal,
      addSkillModal)
  }

  function apply(ctx) {
    var slots = ctx.get('slots')
    if (!slots) return
    ensureStyles()
    slots.inject('settings.section', function () {
      return slots.register(
        { name: 'settings.section', id: 'dsh-agent-sync', order: 50, label: function () { return 'MCP/Skills' } },
        function (props) { return h(Panel, props) })
    })
  }

  exports.apply = apply
  exports.inject = []
  return module.exports
  }
})
