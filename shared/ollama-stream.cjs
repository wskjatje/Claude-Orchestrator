'use strict'

/** Ollama /api/chat stream chunks are incremental; repeated text is valid output. */
function appendOllamaIncrement(current, delta, onDelta) {
  const previous = String(current || '')
  const chunk = typeof delta === 'string' ? delta : ''
  if (!chunk) return previous
  if (typeof onDelta === 'function') onDelta(chunk)
  return previous + chunk
}

module.exports = { appendOllamaIncrement }
