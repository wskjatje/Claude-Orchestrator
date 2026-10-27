#!/usr/bin/env node
/**
 * 闸门：Agent/Skill frontmatter enabled/disabled 解析与写回。
 */
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const support = require(path.join(root, 'server/cad-support.cjs'))

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg)
    process.exitCode = 1
  } else {
    console.log('ok:', msg)
  }
}

const base = `---
description: test
category: 通用
---

# demo
`

assert(support.parseMarkdownEnabled(base) === true, 'default enabled')
assert(support.parseMarkdownEnabled(`---\ndisabled: true\n---\n\n# x\n`) === false, 'disabled:true')
assert(support.parseMarkdownEnabled(`---\nenabled: false\n---\n\n# x\n`) === false, 'enabled:false')

const off = support.applyMarkdownEnabled(base, false)
assert(/disabled:\s*true/.test(off), 'apply disable writes disabled:true')
assert(support.parseMarkdownEnabled(off) === false, 'roundtrip disabled')

const on = support.applyMarkdownEnabled(off, true)
assert(!/^\s*disabled\s*:/m.test(on), 'apply enable strips disabled')
assert(support.parseMarkdownEnabled(on) === true, 'roundtrip enabled')

if (!process.exitCode) console.log('check-markdown-enabled: PASSED')
