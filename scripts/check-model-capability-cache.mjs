import assert from 'node:assert/strict'
import {
  listOllamaModelsWithCapabilities,
  resolveModelCapabilities,
} from '../server/model-capabilities.mjs'

let calls = 0
globalThis.fetch = async (url) => {
  calls += 1
  if (String(url).includes('/api/show')) {
    return new Response(JSON.stringify({
      capabilities: ['completion', 'tools'],
      model_info: { 'llama.context_length': 32_768 },
      parameters: 'temperature 0.7\nnum_ctx 8192',
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  }
  if (String(url).includes('/api/tags')) {
    return new Response(JSON.stringify({
      models: [{ name: 'fixture:latest', digest: 'fixture-digest-a', size: 1234 }],
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  }
  throw new Error(`Unexpected URL: ${url}`)
}

const first = await resolveModelCapabilities({
  modelId: 'fixture:latest', pool: 'local', ollamaBase: 'http://ollama-a:11434',
})
assert.equal(first.contextLength, 8_192, 'configured num_ctx is capped by the model architecture window')
assert.equal(first.capabilities.tools, true)
assert.equal(calls, 1, 'initial request probes /api/show')

const override = await resolveModelCapabilities({
  modelId: 'fixture:latest', pool: 'local', ollamaBase: 'http://ollama-a:11434',
  settings: { modelCapabilityOverrides: { 'fixture:latest': { contextLength: 12_288, tools: false } } },
})
assert.equal(override.contextLength, 12_288, 'user context override remains effective')
assert.equal(override.capabilities.tools, false, 'user capability override remains effective')
assert.equal(calls, 1, 'fresh cache avoids another show request')

const changedRoot = await resolveModelCapabilities({
  modelId: 'fixture:latest', pool: 'local', ollamaBase: 'http://ollama-b:11434',
})
assert.equal(changedRoot.contextLength, 8_192)
assert.equal(calls, 2, 'changing Ollama base invalidates the prior cache')

const catalog = await listOllamaModelsWithCapabilities('http://ollama-b:11434', { refreshShow: false })
assert.equal(catalog.ok, true)
assert.equal(catalog.models?.[0]?.digest, 'fixture-digest-a', '/api/tags digest supplements cached /api/show capabilities')
assert.equal(calls, 3)

console.log('ok: Ollama capability cache refreshes by base, preserves overrides, and merges model digests')
