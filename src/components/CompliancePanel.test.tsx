import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import App from "../App";
import {
  MOCK_SUCCESSFUL_RESULT,
  MOCK_AGENT_GENERATED_RESULT,
  MOCK_STATUS_ONLY_VIOLATION,
} from "../__mocks__/axon-sdk";

type CheckResponse =
  | { kind: "json"; body: unknown; status?: number }
  | { kind: "reject"; error: Error };

/**
 * Route the fetch mock by URL instead of by call order.
 *
 * App fires two independent fetches: getAxonHealth() from the mount effect
 * (`/health`) and runAgentCheck() from the click handler (`/v1/agent/check`).
 * The old helper queued a single response and reassigned global.fetch on each
 * call, so whichever fetch fired first consumed the only queued value. That
 * ordering is timing-dependent (React passive-effect scheduling), which made
 * the suite pass locally but fail ~30% of the time under CI load.
 * Routing by URL gives each call the correct response regardless of order.
 */
function mockAxon(check: CheckResponse, healthOk = true) {
  global.fetch = jest.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/health")) {
      return Promise.resolve({
        ok: healthOk,
        status: healthOk ? 200 : 503,
        json: async () => ({ ok: healthOk }),
      } as unknown as Response);
    }
    // /v1/agent/check
    if (check.kind === "reject") {
      return Promise.reject(check.error);
    }
    const status = check.status ?? 200;
    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: async () => check.body,
    } as unknown as Response);
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  jest.clearAllMocks();
});

test("shows PASSED badge when agent returns no flags", async () => {
  mockAxon({ kind: "json", body: MOCK_SUCCESSFUL_RESULT });

  render(<App />);

  fireEvent.click(screen.getAllByText("Run Compliance Check")[0]);

  expect(await screen.findByText("PASSED")).toBeInTheDocument();
});

test("shows flag count when agent returns flags", async () => {
  mockAxon({ kind: "json", body: MOCK_AGENT_GENERATED_RESULT });

  render(<App />);

  fireEvent.click(screen.getAllByText("Run Compliance Check")[0]);

  expect(await screen.findByText(/1 FLAG/)).toBeInTheDocument();
});

test("does NOT show PASSED when flags are empty but status is not clean", async () => {
  // Regression for the false-pass bug: an out-of-band violation (problem in
  // `status`/`summary`, empty `flags`) must surface as NEEDS REVIEW, not PASSED.
  mockAxon({ kind: "json", body: MOCK_STATUS_ONLY_VIOLATION });

  render(<App />);

  fireEvent.click(screen.getAllByText("Run Compliance Check")[0]);

  expect(await screen.findByText("NEEDS REVIEW")).toBeInTheDocument();
  expect(screen.queryByText("PASSED")).not.toBeInTheDocument();
});

test("surfaces an error when the agent response is malformed", async () => {
  // A malformed response must fail closed (explicit error), never a clean pass.
  mockAxon({ kind: "json", body: { runId: "x", status: "completed" } });

  render(<App />);

  fireEvent.click(screen.getAllByText("Run Compliance Check")[0]);

  expect(await screen.findByText(/Check failed/)).toBeInTheDocument();
  expect(screen.queryByText("PASSED")).not.toBeInTheDocument();
});

test("shows error message when agent check fails", async () => {
  mockAxon({ kind: "reject", error: new Error("Network error") });

  render(<App />);

  fireEvent.click(screen.getAllByText("Run Compliance Check")[0]);

  await waitFor(() => {
    expect(screen.getByText(/Check failed/)).toBeInTheDocument();
  });
});
