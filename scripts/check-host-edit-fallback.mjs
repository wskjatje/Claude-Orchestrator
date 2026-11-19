import assert from 'node:assert/strict'
import { applySearchReplace } from '../server/host-agent-loop.mjs'

const exact = applySearchReplace('const a = 1\n', 'const a = 1', 'const a = 2', false)
assert.equal(exact.ok, true)
assert.equal(exact.strategy, 'exact')
assert.equal(exact.content, 'const a = 2\n')

const whitespace = applySearchReplace(
  'function run() {\n    return value + 1\n}\n',
  'function run() {\n  return value + 1\n}',
  'function run() {\n    return value + 2\n}',
  false,
)
assert.equal(whitespace.ok, true)
assert.equal(whitespace.strategy, 'whitespace-normalized')
assert.match(whitespace.content, /value \+ 2/)

const ambiguous = applySearchReplace('a   b\na\tb\n', 'a b', 'x', false)
assert.equal(ambiguous.ok, false)
assert.match(ambiguous.error, /not unique/)

const nearest = applySearchReplace('line 1\ntarget line\nline 3', 'target line\nmissing', 'x', false)
assert.equal(nearest.ok, false)
assert.match(nearest.error, /nearest lines around 2/)

const anchored = applySearchReplace(
  'start\nkeep one\nactual middle\nkeep three\nend\n',
  'start\nkeep one\nexpected middle\nkeep three\nend',
  'start\nkeep one\nnew middle\nkeep three\nend',
  false,
)
assert.equal(anchored.ok, true)
assert.equal(anchored.strategy, 'line-anchor')
assert.match(anchored.content, /new middle/)

const readGutter = applySearchReplace(
  'export function greeting(name) {\n  return `hello, ${name}`\n}\n',
  '    1 │ export function greeting(name) {\n    2 │   return `hello, ${name}`\n    3 │ }',
  '    1 │ export function greeting(name) {\n    2 │   return `bonjour, ${name}`\n    3 │ }',
  false,
)
assert.equal(readGutter.ok, true)
assert.match(readGutter.strategy, /^read-gutter-/)
assert.match(readGutter.content, /bonjour/)
assert.doesNotMatch(readGutter.content, /│/)

const threeLineAnchor = applySearchReplace(
  'export function greeting(name) {\n  return `hello, ${name}`\n}\n',
  'export function greeting(name) {\n  return "hello " + name\n}',
  'export function greeting(name) {\n  return `bonjour, ${name}`\n}',
  false,
)
assert.equal(threeLineAnchor.ok, true)
assert.equal(threeLineAnchor.strategy, 'line-anchor')
assert.match(threeLineAnchor.content, /bonjour/)

const ambiguousThreeLine = applySearchReplace(
  'start\nold a\nend\nstart\nold b\nend\n',
  'start\nexpected\nend',
  'start\nnew\nend',
  false,
)
assert.equal(ambiguousThreeLine.ok, false)
assert.match(ambiguousThreeLine.error, /not unique/)

const templatePlaceholder = applySearchReplace(
  'export function greeting(name) {\n  return `hello, ${name}`\n}\n',
  'hello, $ name',
  'bonjour, $ name',
  false,
)
assert.equal(templatePlaceholder.ok, true)
assert.equal(templatePlaceholder.strategy, 'template-placeholder')
assert.match(templatePlaceholder.content, /`bonjour, \$\{name\}`/)
assert.doesNotMatch(templatePlaceholder.content, /\$ name/)

const changedTemplateVariable = applySearchReplace(
  'return `hello, ${name}`\n',
  'hello, $ name',
  'bonjour, $ user',
  false,
)
assert.equal(changedTemplateVariable.ok, false)

const ambiguousTemplatePlaceholder = applySearchReplace(
  'const a = `hello, ${name}`\nconst b = `hello, ${name}`\n',
  'hello, $ name',
  'bonjour, $ name',
  false,
)
assert.equal(ambiguousTemplatePlaceholder.ok, false)
assert.match(ambiguousTemplatePlaceholder.error, /not unique/)

console.log('check-host-edit-fallback: ok')
