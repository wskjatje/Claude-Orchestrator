import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const nativeProtocols = require('./model-tool-adapters.cjs')

const adapters = Object.freeze({
  anthropic: Object.freeze({
    buildRequest: (messages, tools, toolChoice, model) =>
      nativeProtocols.toAnthropicRequest(messages, tools, toolChoice, model),
    readStream: (response, options) =>
      nativeProtocols.readNativeStream(response, 'anthropic', options),
  }),
  gemini: Object.freeze({
    buildRequest: (messages, tools, toolChoice) =>
      nativeProtocols.toGeminiRequest(messages, tools, toolChoice),
    readStream: (response, options) =>
      nativeProtocols.readNativeStream(response, 'gemini', options),
  }),
})

/** Return the existing provider protocol adapter without selecting a backend. */
export function getNativeModelAdapter(kind) {
  return adapters[String(kind || '').trim()] || null
}
