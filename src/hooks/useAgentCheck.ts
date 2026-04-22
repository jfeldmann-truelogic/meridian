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

      setState({ loading: false, result, error: null });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Unknown error during agent check";

      setState({ loading: false, result: null, error: message });
    }
  }, []);

  return { ...state, triggerCheck };
}
