#!/usr/bin/env node
/**
 * 闸门：UI 烟雾契约（读源码断言，对齐 A–C 修复）。
 * 真浏览器点选仍靠人工 / 后续 Playwright；此处防回归。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8')
}

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg)
    process.exitCode = 1
  } else {
    console.log('ok:', msg)
  }
}

const chip = read('web/src/components/composer-session-chip.tsx')
assert(/modal\b/.test(chip) && !/modal=\{false\}/.test(chip), 'session chip: modal dismiss')
assert(/pickMode|setOpen\(false\)/.test(chip), 'session chip: close on mode pick')
assert(/去创建/.test(chip), 'session chip: empty agents CTA')
assert(/去管理/.test(chip), 'session chip: empty skills CTA')

const dd = read('web/src/components/ui/dropdown-menu.tsx')
assert(
  /data-\[state=closed\]:pointer-events-none/.test(dd),
  'dropdown: closed content no pointer steal',
)

const pane = read('web/src/components/chat-messages-pane.tsx')
assert(/CHAT_VISIBLE_TURN_CAP/.test(pane), 'messages: turn cap collapse')
assert(/sessionKey/.test(pane), 'messages: collapse reset by session not stream')

const copy = read('web/src/lib/ui-copy.ts')
assert(/EMPTY_STATE_OFFLINE/.test(copy), 'copy: offline empty state')
assert(/USER_PREFS_LOAD_FAILED/.test(copy), 'copy: prefs load failed')
assert(/CHAT_SHOW_EARLIER_TURNS/.test(copy), 'copy: earlier turns')

const prefs = read('web/src/components/user-preferences-panel.tsx')
assert(/finally[\s\S]*setLoading\(false\)/.test(prefs), 'prefs: loading always ends')
assert(/USER_PREFS_LOAD_FAILED|loadError/.test(prefs), 'prefs: error + retry path')

const agents = read('web/src/routes/agents.tsx')
assert(/EMPTY_STATE_OFFLINE/.test(agents), 'agents: offline empty')
assert(/useDesktopActionGate/.test(agents), 'agents: action gate')
assert(/setClaudeAgentMarkdownEnabled/.test(agents), 'agents: persist enable toggle')
assert(/role="switch"/.test(agents), 'agents: enable switch')

const ready = read('web/src/hooks/use-desktop-ready.tsx')
assert(/useDesktopActionGate/.test(ready), 'hook: useDesktopActionGate')
assert(/canAct/.test(ready), 'hook: canAct')

const comms = read('web/src/routes/comms.tsx')
assert(/EMPTY_STATE_OFFLINE/.test(comms) && /useDesktopActionGate/.test(comms), 'comms: offline empty + gate')

const skills = read('web/src/routes/skills.tsx')
assert(/useDesktopActionGate/.test(skills), 'skills: action gate')
assert(!/calls:\s*0/.test(skills), 'skills: no fake calls:0')
assert(!/本周调用/.test(skills), 'skills: no fake call stats')
assert(/setClaudeSkillMarkdownEnabled/.test(skills), 'skills: persist enable toggle')

const bridge = read('web/src/lib/install-desktop-bridge.ts')
assert(/setClaudeAgentMarkdownEnabled/.test(bridge), 'bridge: agent enable rpc')
assert(/setClaudeSkillMarkdownEnabled/.test(bridge), 'bridge: skill enable rpc')

const support = read('server/cad-support.cjs')
assert(/parseMarkdownEnabled/.test(support) && /setClaudeAgentMarkdownEnabled/.test(support), 'support: enable helpers exported')

const chains = read('web/src/routes/chains.tsx')
assert(/EMPTY_STATE_OFFLINE/.test(chains) && /useDesktopActionGate/.test(chains), 'chains: offline empty + gate')

const models = read('web/src/components/models-connections-panel.tsx')
assert(/useDesktopActionGate/.test(models), 'models: action gate')
assert(/actionsLocked/.test(models), 'models: actionsLocked')

const gcp = read('web/src/components/global-chat-panel.tsx')
assert(/useChatStream/.test(gcp), 'global chat: headless stream resume')
assert(/!isChatPageMounted/.test(gcp), 'global chat: subscribe when off chat page')
assert(/isRequestIdInActiveMap/.test(gcp), 'global chat: map is sessionId→requestId')
assert(/sessionIdForActiveRequest/.test(gcp), 'global chat: resolve session from requestId')

const streamHook = read('web/src/hooks/use-chat-stream.ts')
assert(/matchRequestId/.test(streamHook), 'useChatStream: matchRequestId')

const chatPage = read('web/src/routes/index.tsx')
assert(/pickLiveChatMessages/.test(chatPage), 'chat remount: prefer live/perSession over disk')
assert(/isChatStreamLive/.test(chatPage), 'chat remount: skip disk while stream live')

const helpers = read('web/src/lib/chat-send-helpers.ts')
assert(/export function pickLiveChatMessages/.test(helpers), 'helpers: pickLiveChatMessages')
assert(/export function isRequestIdInActiveMap/.test(helpers), 'helpers: isRequestIdInActiveMap')

const side = read('web/src/lib/sidebar-connection-label.ts')
assert(/isWebBridge\(\)/.test(side) && /DESKTOP_HYDRATING/.test(side), 'sidebar: web bridge before desktop label')

assert(/重试/.test(prefs), 'prefs: retry control')

if (!process.exitCode) console.log('check-ui-smoke: PASSED')
