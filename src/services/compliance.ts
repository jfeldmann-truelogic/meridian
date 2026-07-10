import { AgentCheckResult, FlagSeverity } from "../types";

// Severities the UI knows how to render, ordered least -> most severe.
// Anything outside this set is treated as the MOST severe (fail-closed),
// never silently downgraded to "info".
export const SEVERITY_ORDER: FlagSeverity[] = [
  "info",
  "warning",
  "critical",
  "blocker",
];

const KNOWN_SEVERITIES = new Set<string>(SEVERITY_ORDER);

export function isKnownSeverity(s: string): s is FlagSeverity {
  return KNOWN_SEVERITIES.has(s);
}

// Run-lifecycle statuses that represent a cleanly completed check.
// NOTE: the agent conflates run lifecycle and compliance verdict under a bare
// `status` string. Until the platform ships a dedicated verdict field, a clean
// PASS is asserted only when the run reports one of these AND there are zero
// flags. Any other status with no flags is surfaced as NEEDS REVIEW.
const CLEAN_STATUSES = new Set([
  "completed",
  "passed",
  "clean",
  "ok",
  "success",
  "approved",
]);

export type CheckOutcome = "passed" | "flagged" | "needs_review";

/**
 * Decide the compliance outcome. Fail-closed: absence of flags is NOT treated
 * as a pass unless the run also reports a clean status. This prevents a false
 * clean PASS when the agent signals a problem out-of-band (via `status`,
 * `summary`, or `raw`) while returning an empty `flags` array.
 */
export function classifyOutcome(result: AgentCheckResult): CheckOutcome {
  if (result.flags.length > 0) return "flagged";
  const status = String(result.status ?? "").trim().toLowerCase();
  return CLEAN_STATUSES.has(status) ? "passed" : "needs_review";
}

/**
 * Validate the shape of an agent response at the client boundary. Throws on a
 * malformed response so it surfaces as an explicit error instead of silently
 * rendering a clean PASS. This is the missing runtime validation that let
 * unexpected agent output slip through (see the `as any` cast in the mock).
 */
export function assertValidAgentCheckResult(
  x: unknown
): asserts x is AgentCheckResult {
  if (typeof x !== "object" || x === null) {
    throw new Error("Malformed agent response: expected an object");
  }
  const r = x as Record<string, unknown>;
  const errors: string[] = [];

  if (typeof r.runId !== "string") errors.push("runId");
  if (typeof r.status !== "string") errors.push("status");
  if (typeof r.summary !== "string") errors.push("summary");

  if (!Array.isArray(r.flags)) {
    errors.push("flags");
  } else {
    r.flags.forEach((f, i) => {
      if (typeof f !== "object" || f === null) {
        errors.push(`flags[${i}]`);
        return;
      }
      const flag = f as Record<string, unknown>;
      (["flagId", "message", "ruleId", "severity"] as const).forEach((k) => {
        if (typeof flag[k] !== "string") errors.push(`flags[${i}].${k}`);
      });
    });
  }

  if (errors.length > 0) {
    throw new Error(
      `Malformed agent response (invalid fields: ${errors.join(", ")})`
    );
  }
}
