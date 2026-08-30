import React from "react";
import { AgentCheckResult, ComplianceFlag } from "../types";
import { classifyOutcome, isKnownSeverity } from "../services/compliance";

interface CompliancePanelProps {
  result: AgentCheckResult | null;
  loading: boolean;
  error: string | null;
}

const SEVERITY_STYLES: Record<string, React.CSSProperties> = {
  info: { borderLeft: "4px solid #3b82f6", background: "#eff6ff" },
  warning: { borderLeft: "4px solid #f59e0b", background: "#fffbeb" },
  critical: { borderLeft: "4px solid #ef4444", background: "#fef2f2" },
  blocker: { borderLeft: "4px solid #7f1d1d", background: "#fee2e2" },
};

function FlagCard({ flag }: { flag: ComplianceFlag }) {
  // Fail-closed: an unknown severity is styled as the most severe (blocker),
  // never silently downgraded to the "info" blue.
  const style = isKnownSeverity(flag.severity)
    ? SEVERITY_STYLES[flag.severity]
    : SEVERITY_STYLES.blocker;
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

  const outcome = classifyOutcome(result);
  const badge = {
    passed: { label: "PASSED", background: "#dcfce7", color: "#166534" },
    flagged: {
      label: `${result.flags.length} FLAG(S)`,
      background: "#fef9c3",
      color: "#854d0e",
    },
    needs_review: {
      label: "NEEDS REVIEW",
      background: "#fef9c3",
      color: "#854d0e",
    },
  }[outcome];

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
            background: badge.background,
            color: badge.color,
          }}
        >
          {badge.label}
        </span>
        <span style={{ fontSize: 12, color: "#9ca3af" }}>run: {result.runId}</span>
        {result.confidence !== undefined && (
          <span style={{ fontSize: 12, color: "#9ca3af" }}>
            confidence: {(result.confidence * 100).toFixed(0)}%
          </span>
        )}
      </div>

      {outcome === "needs_review" && (
        <p style={{ fontSize: 13, color: "#854d0e", marginBottom: 12 }}>
          Agent returned no structured flags but did not report a clean result
          (status: <code>{String(result.status)}</code>). Manual review
          required.
        </p>
      )}

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
