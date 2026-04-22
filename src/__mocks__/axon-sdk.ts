/**
 * Axon Platform SDK – test stub
 *
 * This file is auto-resolved by Jest when axonClient imports from
 * '../services/axonClient' and the test mocks fetch globally.
 *
 * The stub returns a SUCCESSFUL response by default.
 * Tests that want failure scenarios should override global.fetch directly.
 */

import { AgentCheckResult } from "../types";

export const MOCK_SUCCESSFUL_RESULT: AgentCheckResult = {
  runId: "run-test-001",
  status: "completed",
  flags: [],
  summary: "No compliance issues detected.",
  confidence: 0.97,
};

// Agent-generated change introduced in sprint 32 to add a new rule check.
// The agent updated the mock to include a flag, but used the wrong severity
// value ("blocker" instead of "critical"). This passes TypeScript because
// ComplianceFlag.severity is typed as string, and the UI silently falls back
// to the "info" style, hiding what should be a critical signal.
export const MOCK_AGENT_GENERATED_RESULT: AgentCheckResult = {
  runId: "run-agent-gen-034",
  status: "completed",
  flags: [
    {
      flagId: "flag-001",
      severity: "blocker" as any,   // <-- agent used wrong enum value
      message: "Order value exceeds single-transaction threshold without secondary approval.",
      ruleId: "THRESH-500",
    },
  ],
  summary: "Threshold rule triggered. Secondary review recommended.",
  confidence: 0.88,
};
