import { AgentCheckRequest, AgentCheckResult } from "../types";
import { assertValidAgentCheckResult } from "./compliance";

const ENDPOINT = process.env.REACT_APP_AXON_ENDPOINT;
const API_KEY = process.env.REACT_APP_AXON_API_KEY;
const TENANT = process.env.REACT_APP_AXON_TENANT;
const TIMEOUT = Number(process.env.REACT_APP_AGENT_TIMEOUT_MS) || 5000;

function buildHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-Axon-Key": API_KEY ?? "",
    "X-Axon-Tenant": TENANT ?? "",
  };
}

export async function runAgentCheck(
  req: AgentCheckRequest
): Promise<AgentCheckResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);

  let response: Response;
  try {
    response = await fetch(`${ENDPOINT}/v1/agent/check`, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify(req),
      signal: controller.signal,
    });
  } catch (err) {
    console.error("axonClient: fetch failed", err);
    throw err;
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new Error(`Agent check failed: ${response.status}`);
  }

  const result = await response.json();
  // Validate the shape at the boundary. A malformed response throws here and
  // surfaces as an explicit error rather than silently rendering a clean PASS.
  assertValidAgentCheckResult(result);
  return result;
}

export async function getAxonHealth(): Promise<{ ok: boolean; latencyMs: number }> {
  const t0 = Date.now();
  try {
    const res = await fetch(`${ENDPOINT}/health`, { headers: buildHeaders() });
    return { ok: res.ok, latencyMs: Date.now() - t0 };
  } catch {
    return { ok: false, latencyMs: -1 };
  }
}
