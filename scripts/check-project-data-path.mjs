#!/usr/bin/env node
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import path from 'node:path'

const require = createRequire(import.meta.url)
const { resolveProjectDataPaths } = require('../server/project-data-path.cjs')

const installed = resolveProjectDataPaths(
  {
    CLAUDE_ORCHESTRATOR_USER_DATA: '/tmp/workbench-user-data',
    CLAUDE_ORCHESTRATOR_PROJECT_ROOT: '/tmp/workbench-project',
  },
  '/tmp/backend/server',
)
assert.equal(installed.projectDataDir, path.join('/tmp/workbench-user-data', '.claudecode'))
assert.equal(installed.projectDbPath, path.join(installed.projectDataDir, 'workbench.db'))

const development = resolveProjectDataPaths({}, '/tmp/workbench/server')
assert.equal(development.projectRoot, '/tmp/workbench')
assert.equal(development.projectDataDir, '/tmp/workbench/.claudecode')

console.log('check-project-data-path: PASSED')
