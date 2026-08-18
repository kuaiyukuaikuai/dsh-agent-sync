// dsh-agent-sync — Browser half.
//
// Renders the "Agent 同步" management panel inside Settings (settings.section).
// All data/actions go through the host's HTTP routes under /dsh-agent-sync/*.
//
// Layout: a source tab row (all / codex / claude / cc-switch / custom), then a
// second tab row to switch between "可同步的 MCP" and "可同步的 Skills". The DSH
// status section does the same: profile tab (web / desktop), then MCP / Skills
// switch tabs. Styled with DSH theme tokens so it matches the plugin market.
//
// Hand-written in the lazy-CJS bundle protocol (window.__ModuleLoader__.load
// with a factory returning cordis-plugin exports), so no build step and no
// imports from dsh client packages — the same zero-dependency stance as the
// host half.

window.__ModuleLoader__.load({
  id: 'dsh-agent-sync',
  factory: function (require) {
    var module = { exports: {} }
    var exports = module.exports
    var React = require('react')

    var CSS = '' +
      '.ags-panel{font-size:13px;line-height:1.5;color:var(--dsw-alias-label-primary,#1f2328);max-width:860px}' +
      '.ags-h{font-weight:600;margin:10px 0 4px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}' +
      '.ags-title{font-size:16px;font-weight:500;line-height:24px}' +
      '.ags-sub{color:var(--dsw-alias-label-tertiary,#8b93a1);font-size:12px}' +
      '.ags-sec{background:var(--dsw-alias-bg-layer-1,#ffffff);border:1px solid var(--dsw-alias-border-l1,#e5e7eb);border-radius:8px;padding:10px 12px;margin:8px 0}' +
      '.ags-row{display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid var(--dsw-alias-border-l1,#eceef1)}' +
      '.ags-row:last-child{border-bottom:none}' +
      '.ags-name{font-weight:500;flex:0 0 auto}.ags-off{opacity:.45}' +
      '.ags-meta{color:var(--dsw-alias-label-secondary,#6b7280);font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;flex:1 1 auto}' +
      '.ags-tag{border:1px solid var(--dsw-alias-border-l2,#d9dde3);color:var(--dsw-alias-label-secondary,#6b7280);border-radius:4px;flex:0 0 auto;padding:1px 6px;font-size:11px;line-height:16px}' +
      '.ags-btn{font:inherit;color:var(--dsw-alias-label-primary,#1f2328);background:transparent;border:1px solid var(--dsw-alias-border-l2,#d9dde3);border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;margin-right:6px}' +
      '.ags-btn:hover{border-color:var(--dsw-alias-brand-primary,#4f6ef7);color:var(--dsw-alias-brand-primary,#4f6ef7)}' +
      '.ags-btn:disabled{opacity:.5;cursor:default}' +
      '.ags-btn-primary{border-color:var(--dsw-alias-brand-primary,#4f6ef7);color:var(--dsw-alias-brand-primary,#4f6ef7)}' +
      '.ags-btn-primary:hover{background:var(--dsw-alias-brand-primary,#4f6ef7);color:#fff}' +
      '.ags-tabs{border-bottom:1px solid var(--dsw-alias-border-l2,#e5e7eb);display:flex;gap:2px;margin:4px 0;flex-wrap:wrap}' +
      '.ags-tab{font:inherit;color:var(--dsw-alias-label-secondary,#6b7280);cursor:pointer;white-space:nowrap;background:transparent;border:none;border-bottom:2px solid transparent;padding:7px 12px;font-size:13px}' +
      '.ags-tab-active{color:var(--dsw-alias-brand-primary,#4f6ef7);border-bottom-color:var(--dsw-alias-brand-primary,#4f6ef7);font-weight:600}' +
      '.ags-subh{font-size:12px;font-weight:600;margin:8px 0 2px;color:var(--dsw-alias-label-secondary,#6b7280)}' +
      '.ags-foot{margin-top:8px;padding-top:8px;border-top:1px solid var(--dsw-alias-border-l1,#eceef1)}' +
      '.ags-msg{white-space:pre-wrap;font-size:12px;color:var(--dsw-alias-label-secondary,#6b7280);max-height:140px;overflow:auto;margin-top:8px;border-top:1px dashed var(--dsw-alias-border-l2,#d9dde3);padding-top:6px}' +
      '.ags-in{font:inherit;color:var(--dsw-alias-label-primary,#1f2328);background:transparent;border:1px solid var(--dsw-alias-border-l2,#d9dde3);border-radius:6px;padding:4px 8px;font-size:12px;margin:2px 4px 2px 0}' +
      '.ags-in:focus{outline:none;border-color:var(--dsw-alias-brand-primary,#4f6ef7)}' +
      '.ags-label{font-size:11px;color:var(--dsw-alias-label-secondary,#6b7280);margin-right:2px}' +
      '.ags-empty{color:var(--dsw-alias-label-tertiary,#8b93a1);font-style:italic;padding:4px 0;font-size:12px}' +
      '.ags-err{color:var(--dsw-alias-state-error-primary,#dc2626)}' +
      '.ags-ok{color:var(--dsw-alias-state-success-primary,#16a34a)}' +
      '.ags-checkall{font-size:12px;display:flex;align-items:center;gap:4px;cursor:pointer;user-select:none;color:var(--dsw-alias-label-secondary,#6b7280);margin-left:12px}'

    var styleInjected = false
    function ensureStyles() {
      if (styleInjected) return
      styleInjected = true
      var style = document.createElement('style')
      style.textContent = CSS
      document.head.appendChild(style)
    }

    var h = React.createElement
    var SOURCE_LABELS = { codex: 'Codex', claude: 'Claude Code', ccswitch: 'cc-switch', hermes: 'Hermes', opencode: 'opencode', gemini: 'Gemini', grok: 'Grok', kimi: 'Kimi', codebuddy: 'CodeBuddy', trae: 'Trae', openclaw: 'OpenClaw', qoder: 'Qoder', workbuddy: 'WorkBuddy', zcode: 'Zcode', lingma: '通义灵码', codemoss: 'CodeMoss', copilot: 'Copilot', cursor: 'Cursor', windsurf: 'Windsurf', cline: 'Cline', roo: 'Roo Code', qwen: 'Qwen Code', custom: '自定义' }
    var TAB_KEYS = ['all', 'codex', 'claude', 'ccswitch', 'hermes', 'opencode', 'gemini', 'grok', 'kimi', 'codebuddy', 'trae', 'openclaw', 'qoder', 'workbuddy', 'zcode', 'lingma', 'codemoss', 'copilot', 'cursor', 'windsurf', 'cline', 'roo', 'qwen', 'custom']
    var MAIN_TABS = ['all', 'codex', 'claude', 'ccswitch', 'hermes', 'opencode', 'openclaw', 'grok', 'custom']
    var MORE_TABS = ['gemini', 'kimi', 'codebuddy', 'trae', 'qoder', 'workbuddy', 'zcode', 'lingma', 'codemoss', 'copilot', 'cursor', 'windsurf', 'cline', 'roo', 'qwen']

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

    // Merge all sources and dedupe by name (first source keeps its fields;
    // every source is recorded on the entry's `sources` array).
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

    function Panel(props) {
      var state = React.useState({})
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
      var setState = state[1]
      var upd = function (patch) { setState(function (s) { return Object.assign({}, s, patch) }) }

      function loadAll() {
        upd({ loading: true })
        Promise.all([
          call('scan', {}),
          call('status', {}),
          call('sources', { action: 'list' }),
        ]).then(function (r) {
          upd({ data: r[0], stat: r[1], sources: Array.isArray(r[2]) ? r[2] : [], loading: false })
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

      function runSync(mcpNames, skillNames, overwrite) {
        upd({ busy: true, msg: '' })
        call('sync', { mcp: mcpNames, skills: skillNames, overwrite: !!overwrite }).then(function (res) {
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
          upd({ msg: (enabled ? '已启用 ' : '已停用 ') + name })
          loadAll()
        }).catch(function (e) { upd({ msg: '操作失败: ' + String((e && e.message) || e) }) })
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

      var mcpRows = visibleMcp.map(function (m) {
        return h('div', { key: 'mcp-' + m.name, className: 'ags-row' },
          chk(!!selMcp[m.name], function (v) { upd({ selMcp: Object.assign({}, selMcp, { [m.name]: v }) }) }),
          h('span', { className: 'ags-name' }, m.name),
          h('span', { className: 'ags-tag' }, m.transport || '?'),
          h('span', { className: 'ags-meta' }, (m.command || m.url || '') + (m.error ? ' (' + m.error + ')' : '')),
          sourceTags(m.sources))
      })

      var skillRows = visibleSkills.map(function (s) {
        return h('div', { key: 'skill-' + s.name, className: 'ags-row' },
          chk(!!selSkill[s.name], function (v) { upd({ selSkill: Object.assign({}, selSkill, { [s.name]: v }) }) }),
          h('span', { className: 'ags-name' }, s.name),
          h('span', { className: 'ags-meta' }, String(s.description || '').slice(0, 60)),
          sourceTags(s.sources))
      })

      // DSH 现状数据：profile（web / desktop）分组
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
      var disabledMcp = (stat && stat.disabledMcp) || []
      var disabledSkills = (stat && stat.disabledSkills) || []
      var activeCard = profTabs.filter(function (p) { return p.name === profTab })[0] || profTabs[0] || null

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

      // 可同步内容：按 syncTab 切换 MCP / Skills
      var syncBody = syncTab === 'mcp'
        ? h('div', null,
            mcpRows.length ? mcpRows : h('div', { className: 'ags-empty' }, '该来源暂无 MCP 服务器'),
            h('div', { className: 'ags-foot' },
              h('button', { className: 'ags-btn ags-btn-primary', disabled: busy || !selectedMcp.length, onClick: function () { runSync(selectedMcp, [], false) } }, '同步选中 MCP'),
              h('label', { className: 'ags-checkall' },
                chk(allMcpChecked, function () { toggleAllMcp() }),
                '全选本页')))
        : h('div', null,
            skillRows.length ? skillRows : h('div', { className: 'ags-empty' }, '该来源暂无 skill'),
            h('div', { className: 'ags-foot' },
              h('button', { className: 'ags-btn ags-btn-primary', disabled: busy || !selectedSkill.length, onClick: function () { runSync([], selectedSkill, false) } }, '同步选中 Skill'),
              h('button', { className: 'ags-btn', disabled: busy || !selectedSkill.length, onClick: function () { runSync([], selectedSkill, true) } }, '覆盖同步'),
              h('label', { className: 'ags-checkall' },
                chk(allSkillChecked, function () { toggleAllSkill() }),
                '全选本页')))

      // DSH 现状内容：按 stTab 切换 MCP / Skills（含停用/启用开关）
      var statusBody = stTab === 'mcp'
        ? h('div', null,
            activeCard && activeCard.mcp.length
              ? activeCard.mcp.map(function (name) {
                  return h('div', { key: 'st-' + activeCard.name + '-mcp-' + name, className: 'ags-row' },
                    h('span', { className: 'ags-name' }, 'mcp-' + name),
                    h('button', { className: 'ags-btn', onClick: function () { toggleItem('mcp', name, false) } }, '停用'),
                    h('button', { className: 'ags-btn', onClick: function () { removeItem('mcp', name) } }, '移除'))
                })
              : null,
            disabledMcp.length
              ? disabledMcp.map(function (m) {
                  return h('div', { key: 'st-dis-mcp-' + m.name, className: 'ags-row ags-off' },
                    h('span', { className: 'ags-name' }, 'mcp-' + m.name + '（已停用）'),
                    h('button', { className: 'ags-btn', onClick: function () { toggleItem('mcp', m.name, true) } }, '启用'))
                })
              : null,
            (!activeCard || !activeCard.mcp.length) && !disabledMcp.length
              ? h('div', { className: 'ags-empty' }, '暂无已同步的 MCP')
              : null)
        : h('div', null,
            dshSkillList.length
              ? dshSkillList.map(function (sk) {
                  return h('div', { key: 'st-skill-' + sk.name, className: 'ags-row' },
                    h('span', { className: 'ags-name' }, sk.name),
                    h('button', { className: 'ags-btn', onClick: function () { toggleItem('skill', sk.name, false) } }, '停用'),
                    h('button', { className: 'ags-btn', onClick: function () { removeItem('skill', sk.name) } }, '移除'))
                })
              : null,
            disabledSkills.length
              ? disabledSkills.map(function (s) {
                  return h('div', { key: 'st-dis-skill-' + s.name, className: 'ags-row ags-off' },
                    h('span', { className: 'ags-name' }, s.name + '（已停用）'),
                    h('button', { className: 'ags-btn', onClick: function () { toggleItem('skill', s.name, true) } }, '启用'))
                })
              : null,
            !dshSkillList.length && !disabledSkills.length
              ? h('div', { className: 'ags-empty' }, '暂无已同步的 skill')
              : null)

      return h('div', { className: 'ags-panel' },
        h('div', { className: 'ags-h' },
          h('span', { className: 'ags-title' }, 'MCP/Skills同步'),
          h('button', { className: 'ags-btn', onClick: function () { loadAll() }, disabled: loading }, loading ? '加载中…' : '🔄 刷新'),
          h('span', { className: 'ags-sub' }, '扫描、同步并启停本机各 agent 的 MCP 与 skill')),

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
          h('div', { className: 'ags-h', style: { marginTop: 0 } }, 'DSH 现状（桌面 GUI 重启后生效）'),
          h('div', { className: 'ags-tabs' },
            profTabs.map(function (p) {
              return h('button', { key: 'ptab-' + p.name, className: 'ags-tab' + (activeCard && activeCard.name === p.name ? ' ags-tab-active' : ''), onClick: function () { upd({ profTab: p.name }) } },
                p.name + ' (' + (p.mcp.length + dshSkillList.length) + ')')
            })),
          h('div', { className: 'ags-tabs' },
            h('button', { className: 'ags-tab' + (stTab === 'mcp' ? ' ags-tab-active' : ''), onClick: function () { upd({ stTab: 'mcp' }) } }, 'MCP'),
            h('button', { className: 'ags-tab' + (stTab === 'skills' ? ' ags-tab-active' : ''), onClick: function () { upd({ stTab: 'skills' }) } }, 'Skills')
          ),
          activeCard ? statusBody : h('div', { className: 'ags-empty' }, '暂无 profile 数据')),

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
            h('button', { className: 'ags-btn ags-btn-primary', disabled: !form.id || !form.path, onClick: addSource }, '添加'))),

        msg ? h('div', { className: 'ags-msg' + msgClass }, msg) : null)
    }

    function apply(ctx) {
      var slots = ctx.get('slots')
      if (!slots) return
      ensureStyles()
      slots.inject('settings.section', function () {
        return slots.register(
          { name: 'settings.section', id: 'dsh-agent-sync', order: 50, label: function () { return 'MCP/Skills同步' } },
          function (props) { return h(Panel, props) })
      })
    }

    exports.apply = apply
    exports.inject = []
    return module.exports
  },
})
