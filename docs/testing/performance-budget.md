---
id: performance-budget
title: Performance budget
---

# Performance budget (`@conduction/nextcloud-vue/testing/performance`)

Hydra ADR-124 sets three limits (speed rule of 27 November 2026, which replaced the flat 300 ms page budget):

1. A main page of an app may add at most **150 ms to the Nextcloud floor** for a full page load, warm: page total <= floor + 150 ms. The floor is the bare Nextcloud Dashboard, measured in the same run on the same stack.
2. The page's **first useful content** (its main region painted) appears within **300 ms** of navigation.
3. Every API request answers within **100 ms**.

This helper enforces 1 and 2 in Playwright. The shared Code Quality workflow enforces 3 in Newman.

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
- An exception names one `page` or one `request`, a `budgetMs` at target scale, a `reason` and an `expires` date. For a page, `budgetMs` replaces the 150 ms allowance over the floor (it does not change the first-content target). After that date the normal budget applies again. Hydra gate 124 fails an exception that has no reason, has expired, or runs more than 92 days ahead.

## Add the spec

```ts
// tests/e2e/performance.spec.ts
import { test } from '@playwright/test'
import { definePerformanceSpec } from '@conduction/nextcloud-vue/testing/performance'

definePerformanceSpec(test)
```

The spec creates one test per page. Before the first page, it measures the floor page once per worker: one priming load, then `PERF_PAGE_RUNS` warm loads, median. Each page test then loads its page once to warm the caches, loads it `PERF_PAGE_RUNS` times (default 3) and judges the medians.

| Variable | Default | Effect |
|---|---|---|
| `PERF_FLOOR_PATH` | `/index.php/apps/dashboard/` | The floor page. |
| `PERF_FLOOR_MS` | unset | Use this floor (ms) instead of measuring one, e.g. a Dashboard measured on the same stack with every Conduction app disabled. |

Each test reports per page: floor, total, total minus floor, and first useful content, for example `Workspace: floor 566 ms, total 790 ms, total - floor +224 ms (limit +150), first useful content 420 ms (limit 300)`.

## What "usable" means

The clock starts at navigation. It stops when all of these hold for 100 ms:

- the document has loaded, so every bundle has run;
- the ready selector is visible;
- no fetch or XHR request is in flight;
- no loading indicator (`aria-busy="true"`, `.loading-icon`, `.icon-loading`) is visible in the viewport. An indicator below the fold, such as a lazy widget that waits to mount on scroll or idle, does not hold the page up (speed rule of 27 November 2026: widgets show a loading state at once and load asynchronously).

Presence heartbeats and push channels do not count as pending. This is the page's **total**.

## What "first useful content" means

The largest contentful paint (LCP) inside the page's ready root (its main region), in ms from navigation start: the last LCP candidate whose element sits inside the visible ready selector. When the main region holds no LCP candidate (LCP only counts text and images), the page's own LCP is used and the JSON says `firstContentSource: "page"`. Browsers without LCP (not Chromium) report none, and only the total is judged.

## Budgets per run

`PERF_PAGE_BUDGET_MS / 300` is the run's factor. The 150 ms allowance and the 300 ms first-content target are multiplied by it; the floor is not, because it is measured on the same runner.

| Run | `PERF_PAGE_BUDGET_MS` | Allowance over the floor | First useful content | `PERF_API_BUDGET_MS` |
|---|---|---|---|---|
| Local, default | 300 | 150 | 300 | 100 |
| Nightly fleet sweep | 300 | 150 | 300 | 100 |
| Pull request and push CI | 1000 | 500 | 1000 | 300 |

An exception scales with the run. An allowance exception of 600 ms becomes 2000 ms in pull-request CI.

A failing test names each limit it broke, the measured loads and the slowest requests it saw. The JSON attachment holds the full measurement, including the floor (`floor`, `overFloorMs`). If the floor page itself never becomes usable, every page test fails with that message, since no page can be judged without it.
