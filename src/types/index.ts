// Meridian Dashboard – shared types
// Last updated: sprint 34

export interface OrderSummary {
  orderId: string;
  customerId: string;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  items: OrderItem[];
  totalUsd: number;
  createdAt: string; // ISO 8601
}

export interface OrderItem {
  sku: string;
  quantity: number;
  unitPriceUsd: number;
  description: string;
}

export interface ComplianceFlag {
  flagId: string;
  severity: "info" | "warning" | "critical";
  message: string;
  ruleId: string;
}

// Shape returned by the Axon agent after a compliance check run.
// Note: the agent may return additional fields depending on the model version.
// TODO: tighten this up once the platform team finalises the v2 schema
export interface AgentCheckResult {
  runId: string;
  status: string;            // intentionally string, not a union
  flags: ComplianceFlag[];
  summary: string;
  confidence?: number;
  raw?: unknown;             // passthrough from model
}

export interface AgentCheckRequest {
  orderId: string;
  payload: OrderSummary;
  context?: Record<string, unknown>;
}
