#!/usr/bin/env node
/**
 * 可选真浏览器烟雾：Ask 模式切换 + 底栏可达 + 粘性提问硬断言（有足够轮次时）。
 * 默认连 http://127.0.0.1:5188；无服务则 skip（exit 0）以免阻断离线 CI。
 * 强制跑：CHECK_UI_PLAYWRIGHT=1
 *
 * Chromium：优先仓库 `.playwright-browsers`；executable 缺档时扫描已装二进制（兼容 arch 错配）。
 * 安装：`npm run browser:install`（写入 `.playwright-browsers`）。
 * CI：`ui-playwright` job 用 `mcr.microsoft.com/playwright` 镜像（`PLAYWRIGHT_BROWSERS_PATH=/ms-playwright`）；
 * 本机 Agent：须出沙箱（见 `.cursor/rules/playwright-sandbox.mdc`），否则 Chromium 易 SIGSEGV。
 * 强制跑：CHECK_UI_PLAYWRIGHT=1（无服务则失败）。
 */
import { chromium } from 'playwright'
import { homedir } from 'node:os'
import { join, dirname } from 'node:path'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const base = process.env.UI_SMOKE_BASE || 'http://127.0.0.1:5188'
const force = process.env.CHECK_UI_PLAYWRIGHT === '1'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const webDir = join(root, 'web')
const REPO_BROWSERS = join(root, '.playwright-browsers')

/** Cursor Agent 沙箱常注入空的 /tmp/cursor-sandbox-cache/.../playwright */
function isSandboxBrowsersPath(p) {
  return /cursor-sandbox-cache/i.test(String(p || ''))
}

function browsersPathHasChromium(p) {
  return Boolean(p && findInstalledChromiumBinary(p))
}

function resolveBrowsersPathHint() {
  const envPath = process.env.PLAYWRIGHT_BROWSERS_PATH
  if (envPath && !isSandboxBrowsersPath(envPath) && existsSync(envPath)) {
    return envPath
  }
  if (envPath && isSandboxBrowsersPath(envPath) && browsersPathHasChromium(envPath)) {
    return envPath
  }
  const candidates = [
    REPO_BROWSERS,
    join(homedir(), 'Library', 'Caches', 'ms-playwright'),
    join(homedir(), '.cache', 'ms-playwright'),
  ]
  for (const p of candidates) {
    if (existsSync(p) && browsersPathHasChromium(p)) return p
  }
  for (const p of candidates) {
    if (existsSync(p)) return p
  }
  return candidates[0]
}

/** 确保优先用仓库缓存；空沙箱路径回退到 .playwright-browsers */
function ensureBrowsersPathEnv() {
  const cur = process.env.PLAYWRIGHT_BROWSERS_PATH
  if (cur && !isSandboxBrowsersPath(cur) && existsSync(cur)) return
  if (cur && isSandboxBrowsersPath(cur) && browsersPathHasChromium(cur)) return
  const hint = resolveBrowsersPathHint()
  if (hint && existsSync(hint)) {
    if (cur && cur !== hint) {
      console.log(
        `check-ui-playwright: PLAYWRIGHT_BROWSERS_PATH 不可用 (${cur})，回退 ${hint}`,
      )
    }
    process.env.PLAYWRIGHT_BROWSERS_PATH = hint
  }
}

function chromiumInstallHint() {
  const browsersPath = resolveBrowsersPathHint()
  return [
    'chromium 未安装或路径不可用。',
    `  cd "${webDir}" && PLAYWRIGHT_BROWSERS_PATH="${browsersPath}" npx playwright install chromium`,
    `  （当前 PLAYWRIGHT_BROWSERS_PATH=${process.env.PLAYWRIGHT_BROWSERS_PATH || '(未设置，将用 Playwright 默认缓存)'}）`,
  ].join('\n')
}

/**
 * 在 browsers 根下找 chrome-headless-shell / Chrome for Testing（规避 arch 目录名错配）。
 * @param {string} browsersRoot
 * @returns {string | null}
 */
function findInstalledChromiumBinary(browsersRoot) {
  if (!browsersRoot || !existsSync(browsersRoot)) return null
  /** @type {string[]} */
  const hits = []
  /** @param {string} dir @param {number} depth */
  const walk = (dir, depth) => {
    if (depth > 6 || hits.length >= 8) return
    let entries
    try {
      entries = readdirSync(dir)
    } catch {
      return
    }
    for (const name of entries) {
      const full = join(dir, name)
      let st
      try {
        st = statSync(full)
      } catch {
        continue
      }
      if (st.isDirectory()) {
        walk(full, depth + 1)
        continue
      }
      if (
        name === 'chrome-headless-shell' ||
        name === 'Google Chrome for Testing' ||
        name === 'chrome' ||
        name === 'Chromium'
      ) {
        hits.push(full)
      }
    }
  }
  walk(browsersRoot, 0)
  // 优先 headless shell
  const shell = hits.find((p) => /chrome-headless-shell$/i.test(p))
  return shell || hits[0] || null
}

async function launchChromium() {
  ensureBrowsersPathEnv()
  /** @type {{ headless: boolean, executablePath?: string }} */
  const opts = { headless: true }
  let defaultPath = ''
  try {
    defaultPath = chromium.executablePath()
  } catch {
    defaultPath = ''
  }
  if (!defaultPath || !existsSync(defaultPath)) {
    const found = findInstalledChromiumBinary(
      process.env.PLAYWRIGHT_BROWSERS_PATH || resolveBrowsersPathHint(),
    )
    if (found) {
      opts.executablePath = found
      console.log(`check-ui-playwright: using scanned Chromium ${found}`)
    }
  }
  return chromium.launch(opts)
}

async function probe() {
  try {
    const res = await fetch(base, { signal: AbortSignal.timeout(2500) })
    return res.ok
  } catch {
    return false
  }
}

/**
 * 为 sticky 准备可滚会话：≥minTurns 且 scrollHeight-clientHeight≥minScroll。
 * 短气泡旧会话会 not-enough-scroll，故不足时开新对话并发送加高用户文案（真实发送，不伪造 DOM）。
 */
async function ensureChatTurns(page, minTurns, minScroll = 120) {
  const scroll = page
    .locator('[data-testid="chat-messages-scroll"], .chat-pane-messages-scroll')
    .first()
  const measure = async () => {
    const turns = await page.locator('.chat-turn-section').count()
    let max = 0
    if (await scroll.count()) {
      max = await scroll.evaluate((el) => Math.max(0, el.scrollHeight - el.clientHeight))
    }
    return { turns, max }
  }

  let { turns, max } = await measure()
  if (turns >= minTurns && max >= minScroll) return turns

  const newChat = page.getByRole('button', { name: /^新对话$/ }).first()
  if (await newChat.count()) {
    await newChat.click({ timeout: 5000 }).catch(() => {})
    await page.waitForTimeout(600)
  }

  const composer = page.locator('textarea, [contenteditable="true"]').first()
  await composer.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {})

  let guard = 0
  ;({ turns, max } = await measure())
  while ((turns < minTurns || max < minScroll) && guard < minTurns + 3) {
    guard += 1
    const pad = Array.from({ length: 28 }, (_, n) => `行${n + 1}：粘性滚动填充用于探测。`).join('\n')
    const text = `只回复一个字：粘${guard}\n${pad}`
    // React 受控输入：fill 才能点亮发送；纯 keyboard.type 常写不进 state
    await composer.click({ timeout: 5000 }).catch(() => {})
    await composer.fill(text).catch(async () => {
      await composer.pressSequentially(text, { delay: 2 }).catch(() => {})
    })
    await page.waitForTimeout(150)
    const send = page.getByRole('button', { name: /^发送$/ }).first()
    if (!(await send.count())) {
      throw new Error('sticky seed: 找不到发送按钮')
    }
    if (await send.isDisabled()) {
      await page
        .waitForFunction(
          () => {
            const b = [...document.querySelectorAll('button')].find((el) =>
              /^发送$/.test((el.textContent || '').trim()),
            )
            return Boolean(b && !b.disabled)
          },
          { timeout: 20000 },
        )
        .catch(() => {})
    }
    if (await send.isDisabled()) {
      throw new Error('sticky seed: 发送按钮在 20s 内仍不可用，无法播种第二轮')
    }
    const before = turns
    await send.click({ timeout: 5000 }).catch(() => {})
    await page
      .waitForFunction(
        (n) => document.querySelectorAll('.chat-turn-section').length > n,
        before,
        { timeout: 45000 },
      )
      .catch(() => {})
    await page
      .waitForFunction(
        () => {
          const list = document.querySelectorAll('.chat-turn-section')
          if (!list.length) return false
          return Boolean(list[list.length - 1].querySelector('.chat-bubble-assistant'))
        },
        { timeout: 90000 },
      )
      .catch(() => {})
    await page.waitForTimeout(500)
    ;({ turns, max } = await measure())
    if (turns <= before) {
      throw new Error(
        `sticky seed stalled (turns=${turns} max=${max} before=${before})`,
      )
    }
  }
  console.log(`check-ui-playwright: sticky seed done turns=${turns} scrollMax=${max}`)
  if (turns < minTurns || max < minScroll) {
    throw new Error(
      `sticky seed 不足：turns=${turns}/${minTurns} scrollMax=${max}/${minScroll}`,
    )
  }
  return turns
}

/**
 * 找一个「当前 active 轮提问已滚出视口」的 scrollTop，再断言 sticky。
 * 滚到底时若末轮提问仍贴底，粘性不出现是合法态——故用中段几何探测。
 */
async function assertStickyWhenAway(page) {
  // 取消可能残留的内联编辑，避免 sticky 进 editing 态干扰断言
  await page.keyboard.press('Escape').catch(() => {})
  const cancelEdit = page.getByRole('button', { name: /取消/i }).first()
  if (await cancelEdit.count()) {
    await cancelEdit.click({ timeout: 2000 }).catch(() => {})
    await page.waitForTimeout(150)
  }

  const scroll = page
    .locator('[data-testid="chat-messages-scroll"], .chat-pane-messages-scroll')
    .first()
  if (!(await scroll.count())) {
    console.log('check-ui-playwright: sticky SKIP (no scroll)')
    return
  }
  let turns = await page.locator('.chat-turn-section').count()
  const scrollMax0 = await scroll.evaluate((el) =>
    Math.max(0, el.scrollHeight - el.clientHeight),
  )
  if (turns < 2 || scrollMax0 < 120) {
    turns = await ensureChatTurns(page, 2, 120)
  }
  if (turns < 2) {
    throw new Error(`sticky 需要至少 2 轮，播种后仍为 ${turns}`)
  }

  // 与产品一致：粘性钉的是「当前活跃轮」提问离顶，不是任意一轮离屏。
  // 多档滚动 + 等 RAF/hook 同步；浅滚动内容则 SKIP，避免误报失败。
  const sticky = page.locator('[data-testid="chat-sticky-user-header"]')
  const steps = [0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.95]
  let result = { ok: false, reason: 'no-sticky', max: 0, scrollTop: 0, ratio: 0 }
  for (const ratio of steps) {
    const geom = await scroll.evaluate((el, r) => {
      const max = Math.max(0, el.scrollHeight - el.clientHeight)
      const users = [...el.querySelectorAll('.chat-turn-user')]
      if (users.length < 2 || max < 40) {
        return { ok: false, reason: 'not-enough-scroll', max, users: users.length }
      }
      el.scrollTop = Math.floor(max * r)
      el.dispatchEvent(new Event('scroll'))
      return { ok: true, scrollTop: el.scrollTop, max, ratio: r }
    }, ratio)
    if (!geom.ok) {
      console.log(`check-ui-playwright: sticky SKIP (${geom.reason})`)
      return
    }
    result = { ...geom, ok: false, reason: 'no-sticky' }
    await page.waitForTimeout(280)
    if ((await sticky.count()) >= 1) {
      result = { ...geom, ok: true }
      break
    }
  }

  if (!result.ok) {
    if (result.max < 120) {
      console.log(
        `check-ui-playwright: sticky SKIP (shallow scroll max=${result.max}; 活跃轮可能仍在视口内)`,
      )
      return
    }
    throw new Error(
      `sticky 应在活跃轮提问出视口时出现（tried ratios, last scrollTop=${result.scrollTop}/${result.max}），但未找到 [data-testid=chat-sticky-user-header]`,
    )
  }
  const text = ((await sticky.first().innerText()) || '').trim()
  // 非编辑粘性：不应是内联 Composer 提示条
  if (/编辑此提问|正在编辑历史消息/.test(text)) {
    await page.keyboard.press('Escape').catch(() => {})
    await page.waitForTimeout(250)
    await scroll.evaluate((el) => {
      el.dispatchEvent(new Event('scroll'))
    })
    await page.waitForTimeout(300)
  }
  const text2 = ((await sticky.first().innerText()) || '').trim()
  if (/编辑此提问|正在编辑历史消息/.test(text2)) {
    throw new Error(`sticky 仍处于编辑态，期望只读提问条：${JSON.stringify(text2.slice(0, 80))}`)
  }
  if (!text2) {
    throw new Error('sticky 可见但无文案')
  }
  console.log(
    `check-ui-playwright: sticky OK turns=${turns} scroll=${result.scrollTop} text=${JSON.stringify(text2.slice(0, 40))}`,
  )
}

async function assertContextUsageChip(page) {
  await page.waitForTimeout(200)
  const usage = page.locator('[data-testid="composer-context-usage-chip"]').first()
  const turnCount = await page.locator('.chat-turn-section').count()
  const msgs = await page.locator('.chat-bubble-user, .chat-turn-user').count()
  const count = await usage.count()
  if (count < 1) {
    if (turnCount >= 1 && msgs >= 1) {
      throw new Error('有对话轮次但未找到 [data-testid=composer-context-usage-chip]')
    }
    console.log('check-ui-playwright: context chip soft-skip (empty session)')
    return
  }
  // Cursor 环：可见区无百分比字；本窗/云窗在 aria-label / title
  const label = (
    (await usage.getAttribute('aria-label')) ||
    (await usage.getAttribute('title')) ||
    ''
  ).trim()
  if (!/本窗|云窗/.test(label)) {
    throw new Error(`占用环 aria/title 缺少本窗/云窗：${JSON.stringify(label.slice(0, 80))}`)
  }
  const hasRing = (await usage.locator('svg.composer-context-ring__svg, .composer-context-ring').count()) > 0
  if (!hasRing) {
    throw new Error('占用控件应渲染 Cursor 式 SVG 环 (.composer-context-ring)')
  }
  await usage.click()
  const breakdown = page.locator('[data-testid="composer-context-usage-breakdown"]')
  await breakdown.waitFor({ state: 'visible', timeout: 4000 })
  const detail = ((await breakdown.innerText()) || '').replace(/\s+/g, ' ').trim()
  if (!/本窗|云窗/.test(detail)) {
    throw new Error(`占用明细缺少本窗/云窗：${JSON.stringify(detail.slice(0, 80))}`)
  }
  if (!/字符粗估|接口用量|计入占用|窗口上限/.test(detail)) {
    throw new Error(`占用明细缺少分项行：${JSON.stringify(detail.slice(0, 100))}`)
  }
  const buckets = breakdown.locator('[data-testid="composer-context-usage-buckets"]')
  if ((await buckets.count()) < 1) {
    throw new Error('占用明细应含分项列表 composer-context-usage-buckets')
  }
  const meter = breakdown.locator('[role="meter"], .composer-context-usage-meter')
  if ((await meter.count()) < 1) {
    throw new Error('占用明细应含进度条 meter')
  }
  await page.keyboard.press('Escape')
  console.log(`check-ui-playwright: context ring OK (${label.slice(0, 40)}; ${detail.slice(0, 50)})`)
}

async function main() {
  ensureBrowsersPathEnv()

  const up = await probe()
  if (!up) {
    if (force) {
      console.error(`FAIL: ${base} 不可达且 CHECK_UI_PLAYWRIGHT=1`)
      process.exit(1)
    }
    console.log(`check-ui-playwright: SKIP (${base} 未就绪)`)
    return
  }

  const browser = await launchChromium()
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))

  try {
    await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 30000 })
    // 等 Bridge hydrate：禁止在「连接中」时断言空会话 soft-skip
    await page
      .waitForFunction(
        () => {
          const t = document.body?.innerText || ''
          return t.length > 80 && !/连接中…/.test(t)
        },
        { timeout: 25000 },
      )
      .catch(() => {})
    await page.waitForTimeout(600)

    const ask = page.getByRole('button', { name: /Ask|提问/i }).first()
    if (await ask.count()) {
      await ask.click({ timeout: 5000 }).catch(() => {})
      await page.waitForTimeout(200)
    }

    const composer = page.locator('textarea, [contenteditable="true"]').first()
    await composer.waitFor({ state: 'visible', timeout: 15000 })
    const box = await composer.boundingBox()
    if (!box) throw new Error('composer 无 boundingBox')
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
    await page.keyboard.type('smoke')
    await page.waitForTimeout(100)

    // 仍无历史时尝试发送，让占用环有 sessionHistory（不伪造 DOM）
    {
      const turns = await page.locator('.chat-turn-section').count()
      const chipN = await page.locator('[data-testid="composer-context-usage-chip"]').count()
      if (turns < 1 && chipN < 1) {
        const send = page.getByRole('button', { name: /^发送$/ }).first()
        if ((await send.count()) && !(await send.isDisabled())) {
          await send.click({ timeout: 5000 }).catch(() => {})
          await page
            .waitForFunction(
              () =>
                document.querySelectorAll('.chat-turn-section, .chat-bubble-user').length >= 1,
              { timeout: 20000 },
            )
            .catch(() => {})
          await page.waitForTimeout(400)
        }
      }
    }

    await assertContextUsageChip(page)
    await assertStickyWhenAway(page)

    const agentsNav = page.getByRole('link', { name: /角色|Agent/i }).first()
    if (await agentsNav.count()) {
      await agentsNav.click({ timeout: 8000 })
      await page.waitForTimeout(500)
    }

    if (errors.length) {
      console.error('pageerrors:', errors.slice(0, 3).join('\n'))
      process.exitCode = 1
    } else {
      console.log('check-ui-playwright: PASSED')
    }
  } finally {
    await browser.close()
  }
}

main().catch((e) => {
  const msg = e?.message || String(e)
  if (/Executable doesn't exist|playwright install/i.test(msg) && process.env.CHECK_UI_PLAYWRIGHT !== '1') {
    console.log(`check-ui-playwright: SKIP\n${chromiumInstallHint()}`)
    return
  }
  console.error('FAIL:', msg)
  if (/Executable doesn't exist|playwright install/i.test(msg)) {
    console.error(chromiumInstallHint())
  }
  process.exit(1)
})
