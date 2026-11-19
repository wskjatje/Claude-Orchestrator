import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { detectWorkspaceTestCommand } from '../server/workspace-run-command.mjs'

function fixture(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'claudecode-test-detect-'))
  for (const [name, content] of Object.entries(files)) {
    const abs = path.join(root, name)
    fs.mkdirSync(path.dirname(abs), { recursive: true })
    fs.writeFileSync(abs, content)
  }
  return root
}

const cases = [
  [{ 'package.json': JSON.stringify({ scripts: { test: 'vitest run' } }), 'pnpm-lock.yaml': '' }, 'pnpm-test'],
  [{ 'pytest.ini': '[pytest]' }, 'pytest'],
  [{ 'package.json': JSON.stringify({ devDependencies: { vitest: '^1' } }) }, 'vitest'],
  [{ 'Cargo.toml': '[package]\nname="x"' }, 'cargo-test'],
  [{ 'go.mod': 'module example.com/x' }, 'go-test'],
  [{ 'pom.xml': '<project />' }, 'maven-test'],
  [{ 'build.gradle': 'plugins {}' }, 'gradle-test'],
  [{ Makefile: 'test:\n\t@echo ok\n' }, 'make-test'],
  [{ 'package.json': JSON.stringify({ scripts: { typecheck: 'tsc --noEmit' } }) }, 'npm-typecheck'],
  [{ 'tsconfig.json': '{}' }, 'tsc'],
]

for (const [files, expected] of cases) {
  const root = fixture(files)
  try {
    const got = detectWorkspaceTestCommand(root)
    assert.equal(got.detected, expected, `${expected}: ${got.command}`)
    assert.ok(got.command)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
}

console.log('check-workspace-test-detection: ok')
