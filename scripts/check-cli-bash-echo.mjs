/**
 * CLI Bash / streamEvents output 回显契约闸门。
 */
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import fs from 'node:fs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const parseUrl = pathToFileURL(path.join(root, 'server/claude-stream-parse.mjs')).href

const {
  createStreamDisplayState,
  appendStreamJsonLine,
  finalizeStreamDisplay,
  extractToolResultOutput,
  extractClaudeStreamUsage,
} = await import(parseUrl)

function ok(cond, msg) {
  assert.ok(cond, msg)
  console.log(`ok: ${msg}`)
}

// —— extractToolResultOutput 多形态 ——
ok(extractToolResultOutput('hello') === 'hello', 'string output')
ok(extractToolResultOutput({ stdout: 'a', stderr: 'b' }).includes('a'), 'stdout/stderr object')
ok(extractToolResultOutput([{ type: 'text', text: 'line1' }]).includes('line1'), 'content block array')
ok(extractToolResultOutput({}) === '', 'empty object not [object Object]')

// —— user tool_result 挂到 Bash ——
{
  const s = createStreamDisplayState()
  appendStreamJsonLine(
    JSON.stringify({
      type: 'assistant',
      message: {
        content: [{ type: 'tool_use', id: 'tu1', name: 'Bash', input: { command: 'echo hi' } }],
      },
    }),
    s,
  )
  appendStreamJsonLine(
    JSON.stringify({
      type: 'user',
      message: {
        content: [{ type: 'tool_result', tool_use_id: 'tu1', content: 'hi\n' }],
      },
    }),
    s,
  )
  finalizeStreamDisplay(s)
  const ev = s.events.find((e) => e.name === 'Bash')
  ok(ev?.status === 'ok' && ev?.output?.includes('hi'), 'user tool_result → Bash.output')
  ok(ev?.arg === 'echo hi', 'Bash.arg 保留 command')
}

// —— stdout/stderr 顶层 tool_result ——
{
  const s = createStreamDisplayState()
  appendStreamJsonLine(
    JSON.stringify({
      type: 'tool_use',
      id: 'tu2',
      name: 'Bash',
      input: { command: 'pwd' },
    }),
    s,
  )
  appendStreamJsonLine(
    JSON.stringify({
      type: 'tool_result',
      tool_use_id: 'tu2',
      tool_name: 'Bash',
      stdout: '/tmp\n',
      stderr: '',
    }),
    s,
  )
  finalizeStreamDisplay(s)
  const ev = s.events.find((e) => e.toolUseId === 'tu2' || e.arg === 'pwd')
  ok(ev?.output?.includes('/tmp'), 'tool_result stdout 字段')
}

// —— Claude stream usage 实参抽取（无字段则 null，禁估算） ——
{
  ok(
    extractClaudeStreamUsage({ input_tokens: 12, output_tokens: 3 })?.prompt_tokens === 12,
    'extractClaudeStreamUsage input/output_tokens',
  )
  ok(extractClaudeStreamUsage({}) === null, 'extractClaudeStreamUsage 空对象 → null')
  ok(extractClaudeStreamUsage(null) === null, 'extractClaudeStreamUsage null → null')
  const s = createStreamDisplayState()
  appendStreamJsonLine(
    JSON.stringify({
      type: 'assistant',
      message: {
        content: [{ type: 'text', text: 'hi' }],
        usage: { input_tokens: 40, output_tokens: 2 },
      },
    }),
    s,
  )
  ok(s.usage?.prompt_tokens === 40 && s.usage?.completion_tokens === 2, 'assistant.message.usage → state')
  appendStreamJsonLine(
    JSON.stringify({
      type: 'result',
      result: 'hi',
      usage: { input_tokens: 55, output_tokens: 4 },
    }),
    s,
  )
  ok(s.usage?.prompt_tokens === 55 && s.usage?.completion_tokens === 4, 'result.usage 覆盖为终态')
  const cli = fs.readFileSync(path.join(root, 'server/claude-cli.mjs'), 'utf8')
  ok(/streamState\?\.usage/.test(cli), 'claude-cli 透传 streamState.usage')
}

// —— 前端 fromEvents 不得写死 output:"" ——
{
  const send = fs.readFileSync(path.join(root, 'web/src/hooks/use-chat-send.ts'), 'utf8')
  ok(/output:\s*String\(e\.output/.test(send), 'use-chat-send 使用 e.output')
  ok(!/output:\s*""\s*,\s*\n\s*ok:\s*e\.status/.test(send), '禁止 fromEvents 硬编码空 output')
}

// —— runs 快照稳定 ——
{
  const footer = fs.readFileSync(
    path.join(root, 'web/src/lib/workbench-composer-turn-footer.ts'),
    'utf8',
  )
  ok(
    /getComposerBackgroundTerminalRuns[\s\S]*?return runs/.test(footer) &&
      !/function visibleRuns/.test(footer),
    'composer turn footer runs 引用稳定',
  )
}

// —— Host PTY scrub ——
{
  const runCmd = fs.readFileSync(path.join(root, 'server/workspace-run-command.mjs'), 'utf8')
  ok(/scrubPtyOutput/.test(runCmd) && /ptyMode:\s*'pty'/.test(runCmd), 'run_command PTY 输出 scrub')
}

console.log('\ncheck-cli-bash-echo: PASSED')
