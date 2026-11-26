---
id: performance-budget
title: Performance budget
---

# Performance budget (`@conduction/nextcloud-vue/testing/performance`)

Every main page of an app must be usable within 300 ms, warm. Every API request must answer within 100 ms. Hydra ADR-124 sets these budgets. This helper enforces the page half in Playwright. The shared Code Quality workflow enforces the request half in Newman.

## Declare your main pages

Put them in `tests/performance/budget.json`:

```json
{
  "app": "dossiq",
  "pages": [
    { "name": "Cases", "path": "/index.php/apps/dossiq/cases" },
    { "name": "Inbox", "path": "/index.php/apps/dossiq/inbox", "ready": "[data-testid=\"inbox-list\"]" }
  ],
  "exceptions": [
    {
      "page": "Inbox",
      "budgetMs": 600,
      "reason": "The inbox waits on the mail index; the fix is in dossiq#1234.",
      "expires": "2026-12-31"
    }
  ]
}
```

- `path` is relative to the instance, so the Playwright `baseURL` applies.
- `ready` is optional. Without it the page counts as ready when its `main` landmark is visible.
- An exception names one `page` or one `request`, a `budgetMs` at target scale, a `reason` and an `expires` date. After that date the normal budget applies again. Hydra gate 124 fails an exception that has no reason, has expired, or runs more than 92 days ahead.

## Add the spec

```ts
// tests/e2e/performance.spec.ts
import { test } from '@playwright/test'
import { definePerformanceSpec } from '@conduction/nextcloud-vue/testing/performance'

definePerformanceSpec(test)
```

The spec creates one test per page. Each test loads the page once to warm the caches. It then loads it `PERF_PAGE_RUNS` times (default 3) and judges the median.

## What "usable" means

The clock starts at navigation. It stops when all of these hold for 100 ms:

- the document has loaded, so every bundle has run;
- the ready selector is visible;
- no fetch or XHR request is in flight;
- no loading indicator (`aria-busy="true"`, `.loading-icon`, `.icon-loading`) is visible.

Presence heartbeats and push channels do not count as pending.

## Budgets per run

| Run | `PERF_PAGE_BUDGET_MS` | `PERF_API_BUDGET_MS` |
|---|---|---|
| Local, default | 300 | 100 |
| Nightly fleet sweep | 300 | 100 |
| Pull request and push CI | 1000 | 300 |

An exception scales with the run. An exception of 600 ms becomes 2000 ms in pull-request CI.

A failing test names the measured loads and the slowest requests it saw. The JSON attachment holds the full measurement.
