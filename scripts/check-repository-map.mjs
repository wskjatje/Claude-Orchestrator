import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { buildRepositoryMap } from '../server/repository-map.mjs'

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'repository-map-'))
try {
  fs.mkdirSync(path.join(root, 'src'), { recursive: true })
  fs.mkdirSync(path.join(root, 'server'), { recursive: true })
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ main: 'src/index.ts' }))
  fs.writeFileSync(path.join(root, 'src/index.ts'), 'export function start() {}\nexport const VERSION = 1\n')
  fs.writeFileSync(path.join(root, 'server/main.py'), 'def serve():\n    return True\n')
  fs.writeFileSync(path.join(root, 'src/helper.ts'), 'export const helper = true\n')
  const map = buildRepositoryMap(root, { maxChars: 1600 })
  assert.match(map, /仓库地图/)
  assert.match(map, /src\/index\.ts → start, VERSION/)
  assert.match(map, /server\/main\.py → serve/)
  assert.ok(map.length <= 1600, `map exceeded limit: ${map.length}`)
  const tiny = buildRepositoryMap(root, { maxChars: 1200 })
  assert.ok(tiny.length <= 1200)
  console.log('check-repository-map: ok')
} finally {
  fs.rmSync(root, { recursive: true, force: true })
}
