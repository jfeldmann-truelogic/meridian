import { AgentCheckResult } from "../types";

export const MOCK_SUCCESSFUL_RESULT: AgentCheckResult = {
  runId: "run-test-001",
  status: "completed",
  flags: [],
  summary: "No compliance issues detected.",
  confidence: 0.97,
};

export const MOCK_AGENT_GENERATED_RESULT: AgentCheckResult = {
  runId: "run-agent-gen-034",
  status: "completed",
  flags: [
    {
      flagId: "flag-001",
      severity: "blocker",
      message: "Order value exceeds single-transaction threshold without secondary approval.",
      ruleId: "THRESH-500",
    },
  ],
  summary: "Threshold rule triggered. Secondary review recommended.",
  confidence: 0.88,
};

// Danger case: the agent signals a problem via `status` and `summary` but
// returns an empty `flags` array. The old `flags.length === 0` logic rendered
// this as a clean PASS. It must now surface as NEEDS REVIEW.
export const MOCK_STATUS_ONLY_VIOLATION: AgentCheckResult = {
  runId: "run-agent-gen-099",
  status: "flagged",
  flags: [],
  summary:
    "Threshold rule THRESH-500 triggered, but the model did not emit a structured flag.",
  confidence: 0.61,
};
