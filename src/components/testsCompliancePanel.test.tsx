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

test("shows PASSED badge when agent returns no flags", async () => {
  mockFetchOnce({ ok: true });
  mockFetchOnce(MOCK_SUCCESSFUL_RESULT);

  render(<App />);

  fireEvent.click(screen.getAllByText("Run Compliance Check")[0]);

  await waitFor(() => {
    expect(screen.getByText("PASSED")).toBeInTheDocument();
  });
});

test("shows flag count when agent returns flags", async () => {
  mockFetchOnce({ ok: true });
  mockFetchOnce(MOCK_AGENT_GENERATED_RESULT);

  render(<App />);

  fireEvent.click(screen.getAllByText("Run Compliance Check")[0]);

  expect(screen.getByText(/1 FLAG/)).toBeInTheDocument();
});

test("shows error message when agent check fails", async () => {
  mockFetchOnce({ ok: true });
  global.fetch = jest.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })
    .mockRejectedValueOnce(new Error("Network error"));

  render(<App />);

  fireEvent.click(screen.getAllByText("Run Compliance Check")[0]);

  await waitFor(() => {
    expect(screen.getByText(/Check failed/)).toBeInTheDocument();
  });
});
