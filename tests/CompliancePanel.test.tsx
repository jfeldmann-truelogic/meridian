/**
 * CompliancePanel integration test
 *
 * Tests the full flow: useAgentCheck hook → axonClient → CompliancePanel render.
 * Uses a mocked fetch to avoid real network calls.
 *
 * Known issue: one of the tests is intermittently failing in CI.
 * The customer reported that `npm test` passes locally but fails ~30% of the
 * time on GitHub Actions. The team suspects a timing issue but has not
 * confirmed root cause.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import App from "../src/App";
import {
  MOCK_SUCCESSFUL_RESULT,
  MOCK_AGENT_GENERATED_RESULT,
} from "../src/__mocks__/axon-sdk";

function mockFetchOnce(body: unknown, status = 200) {
  global.fetch = jest.fn().mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response);
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 1: happy path
// ─────────────────────────────────────────────────────────────────────────────
test("shows PASSED badge when agent returns no flags", async () => {
  // Health check + agent check
  mockFetchOnce({ ok: true });           // getAxonHealth
  mockFetchOnce(MOCK_SUCCESSFUL_RESULT); // runAgentCheck

  render(<App />);

  fireEvent.click(screen.getAllByText("Run Compliance Check")[0]);

  await waitFor(() => {
    expect(screen.getByText("PASSED")).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 2: flag rendering
// Flaky: this test occasionally times out in CI because waitFor resolves
// before the second fetch (runAgentCheck) completes. The mock is set up
// correctly, but the component's useEffect for health check consumes the
// first mockResolvedValueOnce, and the second may not have fired before the
// assertion window closes. There is no explicit flush or settled-promise
// guarantee here.
// ─────────────────────────────────────────────────────────────────────────────
test("shows flag count when agent returns flags", async () => {
  mockFetchOnce({ ok: true });                  // getAxonHealth
  mockFetchOnce(MOCK_AGENT_GENERATED_RESULT);   // runAgentCheck

  render(<App />);

  fireEvent.click(screen.getAllByText("Run Compliance Check")[0]);

  // Bug: no `await` on health-check effect; race condition possible
  expect(screen.getByText(/1 FLAG/)).toBeInTheDocument();
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 3: network error path
// ─────────────────────────────────────────────────────────────────────────────
test("shows error message when agent check fails", async () => {
  mockFetchOnce({ ok: true });   // getAxonHealth
  global.fetch = jest.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })
    .mockRejectedValueOnce(new Error("Network error"));

  render(<App />);

  fireEvent.click(screen.getAllByText("Run Compliance Check")[0]);

  await waitFor(() => {
    expect(screen.getByText(/Check failed/)).toBeInTheDocument();
  });
});
