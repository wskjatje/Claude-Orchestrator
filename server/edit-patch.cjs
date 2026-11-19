'use strict'

/**
 * 将单文件 unified diff 应用到内存文本。
 * 只接受 @@ hunk；文件路径由工具参数单独提供，避免 diff header 路径逃逸。
 */
function applyUnifiedPatch(content, patchText) {
  const source = String(content ?? '').replace(/\r\n/g, '\n')
  const patch = String(patchText ?? '').replace(/\r\n/g, '\n')
  if (!patch.trim()) return { ok: false, error: 'empty patch' }
  const original = source.split('\n')
  const patchLines = patch.split('\n')
  const output = []
  let sourceIndex = 0
  let patchIndex = 0
  let hunkCount = 0

  while (patchIndex < patchLines.length) {
    const header = patchLines[patchIndex].match(/^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@/)
    if (!header) {
      patchIndex += 1
      continue
    }
    hunkCount += 1
    const oldStart = Math.max(0, Number(header[1]) - 1)
    if (oldStart < sourceIndex || oldStart > original.length) {
      return { ok: false, error: `patch hunk ${hunkCount} has invalid old start ${header[1]}` }
    }
    output.push(...original.slice(sourceIndex, oldStart))
    sourceIndex = oldStart
    patchIndex += 1

    while (patchIndex < patchLines.length && !patchLines[patchIndex].startsWith('@@')) {
      const line = patchLines[patchIndex]
      if (line.startsWith('--- ') || line.startsWith('+++ ')) {
        patchIndex += 1
        continue
      }
      if (line === '\\ No newline at end of file') {
        patchIndex += 1
        continue
      }
      const marker = line[0]
      const body = line.slice(1)
      if (marker === ' ') {
        if (original[sourceIndex] !== body) {
          return {
            ok: false,
            error: `patch context mismatch at source line ${sourceIndex + 1}`,
            expected: body,
            actual: original[sourceIndex] ?? null,
          }
        }
        output.push(body)
        sourceIndex += 1
      } else if (marker === '-') {
        if (original[sourceIndex] !== body) {
          return {
            ok: false,
            error: `patch removal mismatch at source line ${sourceIndex + 1}`,
            expected: body,
            actual: original[sourceIndex] ?? null,
          }
        }
        sourceIndex += 1
      } else if (marker === '+') {
        output.push(body)
      } else if (line !== '') {
        return { ok: false, error: `unsupported patch line: ${line.slice(0, 120)}` }
      }
      patchIndex += 1
    }
  }
  if (!hunkCount) return { ok: false, error: 'patch has no @@ hunks' }
  output.push(...original.slice(sourceIndex))
  return { ok: true, content: output.join('\n'), hunks: hunkCount }
}

module.exports = { applyUnifiedPatch }
