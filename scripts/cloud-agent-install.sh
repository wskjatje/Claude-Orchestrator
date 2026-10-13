#!/usr/bin/env bash
# Idempotent Cloud Agent install for Claude Orchestrator.
# server/vendor/ is gitignored. When the local CAD tree is absent, this writes
# package manifests and startup stubs so Bridge can load. Existing files are kept.
set -euo pipefail

cd /workspace

export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Node 22.14 (the image default ahead of /usr/local/bin) throws
# ERR_REQUIRE_CYCLE_MODULE while loading Bridge and Vite. 22.23.3 does not.
NODE_VERSION=22.23.3
NODE_PREFIX=/opt/cursor-node
if ! "${NODE_PREFIX}/bin/node" -v 2>/dev/null | grep -qx "v${NODE_VERSION}"; then
  tmp="$(mktemp -d)"
  case "$(uname -m)" in
    x86_64) node_arch=x64 ;;
    aarch64) node_arch=arm64 ;;
    *) echo "unsupported architecture: $(uname -m)" >&2; exit 1 ;;
  esac
  curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${node_arch}.tar.xz" -o "${tmp}/node.tar.xz"
  sudo rm -rf "${NODE_PREFIX}"
  sudo mkdir -p "${NODE_PREFIX}"
  sudo tar -xJf "${tmp}/node.tar.xz" -C "${NODE_PREFIX}" --strip-components=1
  rm -rf "${tmp}"
fi
export PATH="${NODE_PREFIX}/bin:${PATH}"
echo "export PATH=\"${NODE_PREFIX}/bin:\$PATH\"" | sudo tee /etc/profile.d/cursor-node.sh >/dev/null
if [[ -d /usr/local/cargo/bin ]]; then
  sudo ln -sfn "${NODE_PREFIX}/bin/node" /usr/local/cargo/bin/node
  sudo ln -sfn "${NODE_PREFIX}/bin/npm" /usr/local/cargo/bin/npm
  sudo ln -sfn "${NODE_PREFIX}/bin/npx" /usr/local/cargo/bin/npx
fi

npm ci
npm ci --prefix web

mkdir -p server/vendor/cad server/vendor/agent-os-runtime

if [[ ! -f server/vendor/cad/package.json ]]; then
  cat > server/vendor/cad/package.json << 'EOF'
{
  "name": "claude-orchestrator-cad-vendor",
  "private": true,
  "version": "0.0.0",
  "description": "Startup dependencies for gitignored server/vendor/cad. Existing CAD sources are never overwritten.",
  "dependencies": {
    "@modelcontextprotocol/sdk": "1.25.3",
    "better-sqlite3": "11.10.0",
    "zod": "3.25.76"
  }
}
EOF
fi

if [[ ! -f server/vendor/agent-os-runtime/package.json ]]; then
  cat > server/vendor/agent-os-runtime/package.json << 'EOF'
{
  "name": "agent-os-runtime",
  "version": "0.0.0",
  "private": true
}
EOF
fi

if [[ ! -f server/vendor/cad/memory-cross-agent.js ]]; then
  cat > server/vendor/cad/memory-cross-agent.js << 'EOF'
'use strict'

function appendWorkspaceArtifactLog() {
  return { ok: true, stub: true }
}

function buildCrossAgentContextMarkdown() {
  return ''
}

module.exports = {
  appendWorkspaceArtifactLog,
  buildCrossAgentContextMarkdown,
}
EOF
fi

if [[ ! -f server/vendor/cad/local-mcp-orchestrator.js ]]; then
  cat > server/vendor/cad/local-mcp-orchestrator.js << 'EOF'
'use strict'

async function runLocalMcpOrchestration() {
  return {
    ok: false,
    error: 'server/vendor/cad local MCP orchestrator is a startup stub; the full CAD tree is not in git',
  }
}

module.exports = { runLocalMcpOrchestration }
EOF
fi

if [[ ! -f server/vendor/cad/multi-agent-runtime.js ]]; then
  cat > server/vendor/cad/multi-agent-runtime.js << 'EOF'
'use strict'

function asText(value) {
  return typeof value === 'string' ? value : String(value ?? '')
}

function parseDelegationEnvelope() {
  return { ok: false, error: 'CAD multi-agent runtime is not bundled in this checkout' }
}

function normalizeDelegationSteps(obj) {
  return obj && typeof obj === 'object' ? obj : { steps: [] }
}

function buildExecutableDelegationInstruction(step) {
  if (typeof step === 'string') return step
  return asText(step?.instruction || step?.content || '')
}

function buildTaskChainExecutableInstruction(_agentName, _taskId, instruction) {
  return asText(instruction)
}

function appendStepSkillFilesToInstruction(instruction) {
  return asText(instruction)
}

function appendStepMcpsToInstruction(instruction) {
  return asText(instruction)
}

function appendStepChainMetaToInstruction(instruction) {
  return asText(instruction)
}

function buildAgentRoutedInstruction(_agentName, instruction) {
  return asText(instruction)
}

module.exports = {
  parseDelegationEnvelope,
  normalizeDelegationSteps,
  buildExecutableDelegationInstruction,
  buildTaskChainExecutableInstruction,
  appendStepSkillFilesToInstruction,
  appendStepMcpsToInstruction,
  appendStepChainMetaToInstruction,
  buildAgentRoutedInstruction,
}
EOF
fi

npm run vendor:install
node -e "const Database=require('./server/vendor/cad/node_modules/better-sqlite3'); const db=new Database(':memory:'); db.close(); require('./server/vendor/cad/node_modules/@modelcontextprotocol/sdk/dist/cjs/client/index.js'); console.log('vendor native and MCP SDK OK')"
