// Smoke tests for the dsh-agent-sync host module.
import test from 'node:test'
import assert from 'node:assert/strict'
import { name, inject, apply } from './index.mjs'

test('module shape', () => {
  assert.equal(name, 'dsh-agent-sync')
  assert.ok(Array.isArray(inject))
  assert.equal(typeof apply, 'function')
})

test('apply registers tools and returns a disposer', () => {
  const registered = []
  const ctx = {
    tools: { register: (tool) => registered.push(tool) },
    get: () => undefined,
    logger: { warn: () => {} },
  }
  const dispose = apply(ctx)
  assert.equal(typeof dispose, 'function')
  assert.ok(registered.length >= 5, `expected >=5 tools, got ${registered.length}`)
  const toolNames = registered.map((t) => t.name)
  for (const expected of ['agent_sync_scan', 'agent_sync_do', 'agent_sync_status', 'agent_sync_remove', 'agent_sync_sources']) {
    assert.ok(toolNames.includes(expected), `missing tool ${expected}`)
  }
  dispose() // must not throw
})
