# Meridian Dashboard — Diagnosis of Three Reported Issues

## Summary

| # | Reported issue | Root cause | Status |
|---|----------------|-----------|--------|
| 1 | `npm test` flaky (~30%) in CI, passes locally | Broken test import (100% fail at HEAD) masking an order-dependent fetch mock | Fixed + verified 30/30 |
| 2 | High-value order shows clean PASS when a warning was expected | Verdict inferred from `flags.length` alone; no response validation | Fixed (fail-closed) + regression tests |
| 3 | Axon connectivity indicator stuck grey in staging | `getAxonHealth` had no timeout; a hanging endpoint left the promise unsettled | Fixed + unit + browser verified |

The three issues share one root: **weak validation at the Axon integration boundary.** See
[Cross-cutting theme](#cross-cutting-theme).

## How the codebase was navigated

Create React App (react-scripts 5, React 18, TS 4.9), small single-page app. Axon integration points:

- `src/services/axonClient.ts` — `runAgentCheck()` (POST `/v1/agent/check`, has a timeout) and
  `getAxonHealth()` (GET `/health`). Reads `REACT_APP_AXON_*` env vars (CRA inlines these at build time).
- `src/hooks/useAgentCheck.ts` — React state wrapper around `runAgentCheck`.
- `src/components/CompliancePanel.tsx` — renders the agent result and the pass/fail verdict.
- `src/App.tsx` — drives the connectivity indicator from a mount-time `getAxonHealth()` call.
- `src/types/index.ts` — shared types.
- `src/components/CompliancePanel.test.tsx`, `src/__mocks__/axon-sdk.ts` — tests and fixtures.

---

## Issue 1 — CI test flakiness

**Evidence.** At HEAD the suite does not run at all:

```
FAIL src/components/CompliancePanel.test.tsx
  ● Test suite failed to run
    Cannot find module '../src/App' from 'src/components/CompliancePanel.test.tsx'
```

Git history shows why: the test file was moved from `tests/` into `src/components/`
(`Rename tests/CompliancePanel.test.tsx to src/components/...`) without updating its imports.
`../src/App` was correct from `tests/`; from `src/components/` it resolves to the non-existent
`src/src/App`. That is a 100% failure, which contradicts "passes locally" — the first sign the
premise describes an *earlier* state of the code.

**Root cause (two layers).**

1. **Broken import path** — masks everything else; CI is red 100% of the time now.
2. **Order-dependent fetch mocking** — the real flakiness. `mockFetchOnce` did
   `global.fetch = jest.fn().mockResolvedValueOnce(...)`, *reassigning* `fetch` on every call, so
   only the last queued response survived. `App` fires **two** independent fetches: `getAxonHealth()`
   from the mount effect (`/health`) and `runAgentCheck()` from the click handler (`/v1/agent/check`).
   Whichever fired first consumed the single queued value; the other received `undefined` and threw.
   Which one fires first depends on React passive-effect scheduling, which differs between a fast local
   machine and a loaded CI runner — hence intermittent. (In this repro environment it lands on the
   deterministic-fail end; the reported ~30% is the same mechanism nearer the middle of the timing
   distribution.)

Secondary: test 2 asserted synchronously with no `waitFor`, and the mount effect produced
`act(...)` warnings.

**Fix** (`src/components/CompliancePanel.test.tsx`). Corrected the relative imports and replaced
queue-order mocking with **URL-based routing** — the mock branches on `/health` vs `/v1/agent/check`,
so each call gets its correct response regardless of order (this also mirrors how the real server
behaves). Assertions use `findBy`/`waitFor`, removing the `act` warnings.

**Verification.** `for i in $(seq 1 30); ...` → **30/30 PASS** (was 30/30 FAIL). No `act` warnings.

---

## Issue 2 — False compliance PASS

**Root cause.** `CompliancePanel` computed the verdict from a single field:

```ts
const passed = result.flags.length === 0;
```

This ignores `status`, `summary`, `confidence`, and `raw`. `AgentCheckResult.status` is deliberately a
bare `string` (the type comment says so), and the agent uses it for the *run lifecycle*
(`"completed"`), not the *compliance verdict*. If the agent signals a violation out-of-band — problem
described in `status`/`summary`/`raw` while `flags` comes back empty, which is a common failure mode
for LLM-generated structured output — the panel renders a clean **PASSED**. There is also **no runtime
validation** of the agent response (the `severity: "blocker" as any` cast in the mock is the tell that
agent output is not being checked).

**Honesty note.** This is *not* reproducible from the shipped mocks — `MOCK_AGENT_GENERATED_RESULT`
contains a flag, so the UI correctly shows "1 FLAG(S)". This is a validation/design defect, exactly the
README's "agent integration validation quality" focus, not a bug the current fixtures trigger.

**Separate, secondary defect (not the cause of the false pass):** the agent emits `severity: "blocker"`,
which is outside the `info|warning|critical` union, so `SEVERITY_STYLES["blocker"]` was `undefined` and
the card silently fell back to `info` (blue) styling — a blocker shown as informational. The flag still
counts, so it does not cause a false pass; it under-represents severity.

**Fix.**

- `src/services/compliance.ts` (new):
  - `classifyOutcome()` is **fail-closed** — a clean PASS is asserted only when the run reports a clean
    status *and* there are zero flags; any other no-flag result surfaces as **NEEDS REVIEW**. Absence of
    flags is no longer treated as evidence of compliance.
  - `assertValidAgentCheckResult()` validates the response shape at the client boundary; a malformed
    response throws (explicit error) instead of rendering a pass.
- `src/services/axonClient.ts` — `runAgentCheck` now validates the parsed response before returning.
- `src/types/index.ts` — `FlagSeverity` widened to include `"blocker"`.
- `src/components/CompliancePanel.tsx` — renders three states (PASSED / N FLAG(S) / NEEDS REVIEW), and
  an unknown severity is styled as the *most* severe, never downgraded to `info`.
- `src/__mocks__/axon-sdk.ts` — removed the `as any`; added `MOCK_STATUS_ONLY_VIOLATION` (empty flags,
  unclean status) to demonstrate the danger case.

**Verification.** New regression tests: an empty-flags/unclean-status response renders **NEEDS REVIEW**
(not PASSED); a malformed response fails closed to an error. Live: clicking a check against a non-OK
endpoint shows "Check failed: Agent check failed: 501" — an explicit error, never a silent pass.

---

## Issue 3 — Connectivity indicator stuck grey

**Root cause.** The indicator is grey exactly while `platformOk === null`, i.e. until `setPlatformOk`
runs (`App.tsx`). `App` calls `getAxonHealth().then(({ ok }) => setPlatformOk(ok))`, and `getAxonHealth`
has an internal try/catch that always *resolves* — so a rejection cannot be the cause. The one way the
promise never settles is a `fetch` that never completes, and `getAxonHealth` had **no timeout /
AbortController**, unlike `runAgentCheck` which does. A reachable-but-hanging staging endpoint (TCP
connects, `/health` response never arrives) leaves the fetch pending forever → indicator stuck on
"Checking Axon…". "The team believes the endpoint is reachable" fits precisely: reachable at the socket
level, but the response hangs.

**Secondary (not the grey cause, worth checking in staging):** CRA inlines `REACT_APP_*` at build time.
A staging build missing `REACT_APP_AXON_ENDPOINT` builds `fetch("undefined/health")`, which typically
resolves to the SPA shell (false green) or errors (red) — colored, not grey. And the `.then()` had no
`.catch()`.

**Fix** (`src/services/axonClient.ts`, `src/App.tsx`).

- Added an `AbortController` timeout to `getAxonHealth` (same `REACT_APP_AGENT_TIMEOUT_MS` pattern as
  `runAgentCheck`). A hung/failed health check resolves to `{ ok: false }` → indicator turns **red**,
  never stuck grey.
- Guard a missing/blank `ENDPOINT` (treat as unreachable, log a clear message).
- Added `.catch(() => setPlatformOk(false))` at the `App` call site as defense in depth.

**Verification.** Unit tests (fake timers): a hanging endpoint settles to `{ ok: false }` within the
timeout; an unconfigured endpoint returns unreachable without fetching. Live (served production build,
no endpoint configured): the indicator resolves to a red "Axon unreachable" dot rather than staying grey.

---

## Cross-cutting theme

**Agent-integration validation quality is weak, and it is the shared root of issues 2 and 3:**

- No runtime schema validation of agent responses (the `as any` cast is the tell).
- The `severity` union did not match what the agent actually emits (`"blocker"`).
- Pass/fail trusted a single field (`flags.length`) rather than a positively-asserted verdict.
- The health check had no timeout, so a degraded platform read as "still checking" rather than "down".

The common failure mode: **the client trusts agent output implicitly.** For a compliance tool, the
default posture must be fail-closed — validate the shape, assert a clean result explicitly, and bound
every platform call in time.

## Production rollout risk

- **High — compliance false-negatives.** Before the Issue 2 fix, a high-value order could show a clean
  PASS when the agent flagged it out-of-band. On a compliance gate this is a business/audit risk, not a
  cosmetic bug. The fail-closed verdict + boundary validation remove the silent path.
- **Medium — monitoring blind spot.** A grey indicator hid an unreachable platform; operators could not
  distinguish "checking" from "down". Now resolved to a definite state within the timeout.
- **Medium — CI signal was untrustworthy.** A suite that fails 100% at HEAD (and was flaky before)
  provides no gate. Now deterministic.

**Recommended follow-ups (beyond this change set):**

1. Have the platform team add an explicit **verdict** field to `AgentCheckResult` (separate from run
   `status`), so the UI does not have to infer compliance from the absence of flags.
2. Gate low-`confidence` results into NEEDS REVIEW with a policy-owned threshold.
3. Apply the same timeout + validation pattern to any future Axon calls.
4. Pin dev dependencies (a fresh install pulled an `@types/node` too new for TS 4.9 — a `tsc --noEmit`
   noise source in `node_modules`, unrelated to the reported issues but worth locking down for
   reproducible CI).
