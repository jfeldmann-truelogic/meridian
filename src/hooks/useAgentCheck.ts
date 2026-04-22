/**
 * useAgentCheck
 *
 * React hook that triggers an Axon compliance check for an order
 * and exposes the result / loading / error state to the UI.
 *
 * Known issues (sprint 34 backlog):
 *  - No debounce; rapid calls can race.
 *  - No retry logic.
 *  - Agent-generated flags are surfaced without any secondary validation.
 */

import { useState, useCallback } from "react";
import { runAgentCheck } from "../services/axonClient";
import { AgentCheckResult, OrderSummary } from "../types";

interface CheckState {
  loading: boolean;
  result: AgentCheckResult | null;
  error: string | null;
}

export function useAgentCheck() {
  const [state, setState] = useState<CheckState>({
    loading: false,
    result: null,
    error: null,
  });

  const triggerCheck = useCallback(async (order: OrderSummary) => {
    setState({ loading: true, result: null, error: null });

    try {
      const result = await runAgentCheck({
        orderId: order.orderId,
        payload: order,
      });

      // Validation gap: we accept whatever the agent returns.
      // A result with status "error" or confidence < 0.5 still reaches the UI
      // and can be displayed as a clean "passed" state if flags[] happens to
      // be empty. There is no guard on result.status or result.confidence here.
      setState({ loading: false, result, error: null });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Unknown error during agent check";

      // Only setting string in state; no log to any monitoring system,
      // no correlation ID, no distinction between transient vs permanent failure.
      setState({ loading: false, result: null, error: message });
    }
  }, []);

  return { ...state, triggerCheck };
}
