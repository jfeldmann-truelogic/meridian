# Meridian Operations Dashboard

## Customer Background

Meridian Industrial Supply is a mid-market B2B distributor. Their operations team processes high-value purchase orders daily, each subject to internal compliance rules (spend thresholds, supplier approval tiers, export regulations).

They are integrating our **Axon AI Platform** to automate compliance pre-checks: when an operations analyst reviews an order, the platform runs an agent-assisted rule check and surfaces flags before the order is approved.

This repository is a snapshot of their current dashboard codebase, taken at the point where the Axon integration is partially complete but not yet stable enough for production rollout.

---

## What the App Is Supposed to Do

1. Display a queue of orders pending compliance review.
2. Allow an analyst to trigger an agent-assisted compliance check per order.
3. Surface any compliance flags returned by the Axon agent.
4. Indicate the health/connectivity status of the Axon platform.

---

## What the Customer Is Reporting

- **Intermittent test failures in CI.** `npm test` is failing roughly 30% of the time on their GitHub Actions pipeline. It always passes locally.
- **"Compliance checks sometimes show passed even when something looks wrong."** An analyst ran a check on a high-value order and the result showed a clean pass, but she expected to see a threshold warning. The team is not sure if this is a data problem, an agent problem, or a rendering problem.
- **The Axon connectivity indicator stays grey** in their staging environment even though the team believes the platform endpoint is reachable.

---

## What We Want From You

You do not need to fix everything. We want to understand how you would:

1. **Navigate and orient yourself** in an unfamiliar codebase.
2. **Identify integration points** between the app and the Axon platform.
3. **Diagnose the issues** the customer is reporting, or find others you notice.
4. **Assess the validation quality** of the current agent integration.
5. **Reason about rollout risk** and what you would communicate to the customer before going to production.

Be prepared to talk through your process, ask clarifying questions, and explain your reasoning. You are not expected to write a complete solution.

---

## Getting Started

```bash
npm install
npm start        # local dev server
npm test         # run tests once (no watch)
npm run type-check  # TypeScript validation only
```

Environment: see `.env.example` for required variables. A `.env` file is included for local development.

---

## Repository Structure

```
meridian-dashboard/
├── public/
│   └── index.html
├── src/
│   ├── __mocks__/
│   │   └── axon-sdk.ts          # Axon SDK test stub
│   ├── components/
│   │   ├── CompliancePanel.tsx  # Renders agent check results
│   │   └── OrderCard.tsx        # Renders a single order + trigger button
│   ├── hooks/
│   │   └── useAgentCheck.ts     # Hook: triggers check, manages state
│   ├── services/
│   │   └── axonClient.ts        # HTTP wrapper for Axon platform API
│   ├── types/
│   │   └── index.ts             # Shared TypeScript types
│   ├── App.tsx
│   └── index.tsx
├── tests/
│   └── CompliancePanel.test.tsx
├── .env
├── .env.example
├── package.json
└── tsconfig.json
```
