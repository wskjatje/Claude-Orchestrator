#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = fs.readFileSync(path.join(root, 'server/packaged-ui-server.mjs'), 'utf8')
const proxyStart = src.indexOf('function proxyToBridge')
const proxyEnd = src.indexOf('\nfunction sendFile', proxyStart)
assert.ok(proxyStart >= 0 && proxyEnd > proxyStart, 'proxyToBridge exists')
const proxy = src.slice(proxyStart, proxyEnd)

assert.ok(!/timeout\s*:\s*\d+/.test(proxy), 'RPC proxy has no fixed execution timeout')
assert.ok(/res\.on\(['"]close['"]/.test(proxy), 'downstream close disposes upstream')
assert.ok(/res\.headersSent/.test(proxy), 'partial response errors are not rewritten as offline JSON')

const vite = fs.readFileSync(path.join(root, 'web/vite.config.ts'), 'utf8')
const apiProxy = vite.slice(vite.indexOf('"/api"'), vite.indexOf('configure:', vite.indexOf('"/api"')))
assert.ok(
  !/timeout\s*:|proxyTimeout\s*:/.test(apiProxy),
  'Vite /api proxy has no fixed execution timeout',
)

console.log('check-rpc-proxy-lifecycle: PASSED')
