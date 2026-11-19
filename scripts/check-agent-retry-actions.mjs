import assert from 'node:assert/strict'
import fs from 'node:fs'

const menu = fs.readFileSync(new URL('../web/src/components/chat-message-context-menu.tsx', import.meta.url), 'utf8')
assert.match(menu, /用当前模型重试/)
assert.match(menu, /使用 Auto 重试/)
assert.match(menu, /只读诊断重试/)

const route = fs.readFileSync(new URL('../web/src/routes/index.tsx', import.meta.url), 'utf8')
assert.match(route, /retryMode === "auto"[\s\S]*modelId: "auto"/)
assert.match(route, /setWorkbenchInteractionMode\("ask"\)/)
assert.match(route, /runCheckpointAction\(historyIndex, "resend"\)/)

console.log('check-agent-retry-actions: ok')
