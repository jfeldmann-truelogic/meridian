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
      severity: "blocker" as any,
      message: "Order value exceeds single-transaction threshold without secondary approval.",
      ruleId: "THRESH-500",
    },
  ],
  summary: "Threshold rule triggered. Secondary review recommended.",
  confidence: 0.88,
};
