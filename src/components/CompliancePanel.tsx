import React from "react";
import { AgentCheckResult, ComplianceFlag } from "../types";

interface CompliancePanelProps {
  result: AgentCheckResult | null;
  loading: boolean;
  error: string | null;
}

const SEVERITY_STYLES: Record<string, React.CSSProperties> = {
  info:     { borderLeft: "4px solid #3b82f6", background: "#eff6ff" },
  warning:  { borderLeft: "4px solid #f59e0b", background: "#fffbeb" },
  critical: { borderLeft: "4px solid #ef4444", background: "#fef2f2" },
};

function FlagCard({ flag }: { flag: ComplianceFlag }) {
  const style = SEVERITY_STYLES[flag.severity] ?? SEVERITY_STYLES.info;
  return (
    <div style={{ ...style, padding: "10px 14px", borderRadius: 4, marginBottom: 8 }}>
      <strong style={{ textTransform: "uppercase", fontSize: 11 }}>
        {flag.severity}
      </strong>{" "}
      <span style={{ fontSize: 12, color: "#6b7280" }}>rule: {flag.ruleId}</span>
      <p style={{ margin: "4px 0 0", fontSize: 14 }}>{flag.message}</p>
    </div>
  );
}

export function CompliancePanel({ result, loading, error }: CompliancePanelProps) {
  if (loading) {
    return <div style={{ padding: 16, color: "#6b7280" }}>Running agent check…</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 16, color: "#b91c1c", background: "#fef2f2", borderRadius: 6 }}>
        <strong>Check failed:</strong> {error}
      </div>
    );
  }

  if (!result) {
    return (
      <div style={{ padding: 16, color: "#9ca3af", fontStyle: "italic" }}>
        No check has been run for this order yet.
      </div>
    );
  }

  // Bug (validation gap): result.status is displayed as-is.
  // If the agent returns status "partial_failure" or "timed_out",
  // the UI shows the flags array (which may be empty) and the user
  // sees a green "passed" panel rather than an indeterminate state.
  const passed = result.flags.length === 0;

  return (
    <div style={{ padding: 16 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <span
          style={{
            padding: "2px 10px",
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 600,
            background: passed ? "#dcfce7" : "#fef9c3",
            color: passed ? "#166534" : "#854d0e",
          }}
        >
          {passed ? "PASSED" : `${result.flags.length} FLAG(S)`}
        </span>
        <span style={{ fontSize: 12, color: "#9ca3af" }}>run: {result.runId}</span>
        {result.confidence !== undefined && (
          <span style={{ fontSize: 12, color: "#9ca3af" }}>
            confidence: {(result.confidence * 100).toFixed(0)}%
          </span>
        )}
      </div>

      {result.summary && (
        <p style={{ fontSize: 14, color: "#374151", marginBottom: 12 }}>
          {result.summary}
        </p>
      )}

      {result.flags.map((f) => (
        <FlagCard key={f.flagId} flag={f} />
      ))}
    </div>
  );
}
