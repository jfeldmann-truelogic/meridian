/**
 * axonClient.ts
 *
 * Thin wrapper around the Axon AI Platform SDK (internal stub).
 * The real SDK is mocked in __mocks__/axon-sdk.ts for testing.
 *
 * Integration status: INCOMPLETE – agent check flow is wired but
 * the response normalisation and error path need review before GA.
 */

import { AgentCheckRequest, AgentCheckResult } from "../types";

const ENDPOINT = process.env.REACT_APP_AXON_ENDPOINT;
const API_KEY  = process.env.REACT_APP_AXON_API_KEY;
const TENANT   = process.env.REACT_APP_AXON_TENANT;
const TIMEOUT  = Number(process.env.REACT_APP_AGENT_TIMEOUT_MS) || 5000;

// Bug (CI): REACT_APP_* vars are embedded at build time by react-scripts.
// If the CI pipeline runs `npm run build` without these in the environment,
// ENDPOINT/API_KEY will be the string "undefined" in the production bundle.
// There is currently no runtime guard here.

function buildHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-Axon-Key": API_KEY ?? "",
    "X-Axon-Tenant": TENANT ?? "",
  };
}

/**
 * Runs a compliance check via the Axon agent for a given order.
 * Returns the structured result, or throws on network / timeout failure.
 */
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
    // Network error or abort – caller receives a rejected promise.
    // No structured logging here; DevTools only.
    console.error("axonClient: fetch failed", err);
    throw err;
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    // Bug (observability): status code is swallowed; caller only sees a
    // generic Error with no request context, trace ID, or retry hint.
    throw new Error(`Agent check failed: ${response.status}`);
  }

  // Bug (fragile shape): response.json() is cast directly to AgentCheckResult.
  // If the Axon platform returns a v2 envelope ({ data: { ... } }) or omits
  // optional fields, downstream code will silently get undefined values
  // rather than a clear schema error.
  const result = (await response.json()) as AgentCheckResult;
  return result;
}

/**
 * Fetches the health / readiness status of the Axon platform.
 * Used by the dashboard header to show a connectivity indicator.
 */
export async function getAxonHealth(): Promise<{ ok: boolean; latencyMs: number }> {
  const t0 = Date.now();
  try {
    const res = await fetch(`${ENDPOINT}/health`, { headers: buildHeaders() });
    return { ok: res.ok, latencyMs: Date.now() - t0 };
  } catch {
    return { ok: false, latencyMs: -1 };
  }
}
