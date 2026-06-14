'use strict'

const { normalizeAgentStem } = require('./agent-artifact-paths.cjs')

/**
 * 须用户手动「确认写入」的 Agent（仅产品经理、项目经理）。
 * 其余 Agent 自动落盘。
 */
const MANUAL_CONFIRM_WRITE_STEMS = new Set([
  'product-manager',
  'project-manager',
  'project-manager-senior',
])

function agentRequiresManualConfirmWrite(agentName) {
  const stem = normalizeAgentStem(agentName)
  if (!stem) return false
  return MANUAL_CONFIRM_WRITE_STEMS.has(stem)
}

function agentAutoWritesToProject(agentName) {
  return !agentRequiresManualConfirmWrite(agentName)
}

module.exports = {
  MANUAL_CONFIRM_WRITE_STEMS,
  agentRequiresManualConfirmWrite,
  agentAutoWritesToProject,
}
