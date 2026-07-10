// Regression tests for the "connectivity indicator stuck grey" bug.
// getAxonHealth previously had no timeout, so a reachable-but-hanging endpoint
// left the promise pending forever and the indicator stayed grey.
export {}; // ensure this file is treated as a module under isolatedModules

const OLD_ENV = process.env;

afterEach(() => {
  process.env = OLD_ENV;
  jest.useRealTimers();
  jest.resetModules();
});

test("getAxonHealth resolves to unreachable when the endpoint hangs", async () => {
  jest.resetModules();
  process.env = {
    ...OLD_ENV,
    REACT_APP_AXON_ENDPOINT: "http://axon.test",
    REACT_APP_AGENT_TIMEOUT_MS: "5000",
  };
  jest.useFakeTimers();

  // A fetch that never resolves on its own, but rejects when aborted.
  global.fetch = jest.fn(
    (_url: RequestInfo | URL, opts?: RequestInit) =>
      new Promise((_resolve, reject) => {
        opts?.signal?.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError"))
        );
      })
  ) as unknown as typeof fetch;

  const { getAxonHealth } = require("./axonClient");
  const promise = getAxonHealth();

  // Fire the timeout; the health check must settle (red), never hang grey.
  jest.advanceTimersByTime(5000);

  await expect(promise).resolves.toEqual({ ok: false, latencyMs: -1 });
});

test("getAxonHealth returns unreachable when the endpoint is not configured", async () => {
  jest.resetModules();
  process.env = { ...OLD_ENV, REACT_APP_AXON_ENDPOINT: "" };

  const fetchMock = jest.fn();
  global.fetch = fetchMock as unknown as typeof fetch;

  const { getAxonHealth } = require("./axonClient");

  await expect(getAxonHealth()).resolves.toEqual({ ok: false, latencyMs: -1 });
  expect(fetchMock).not.toHaveBeenCalled();
});
