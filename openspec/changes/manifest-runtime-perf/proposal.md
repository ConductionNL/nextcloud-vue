---
kind: code
---

# manifest-runtime-perf

## Why

The 2026-07-06 manifest fleet audit (apps-extra/MANIFEST-AUDIT-2026-07-06.md,
items 10 + 12) found two runtime issues in the manifest renderer:

1. **Linear page scans per navigation.** `CnPageRenderer` resolves the current
   page and the index→detail row-click wiring with `pages.find()` /
   `pages.some()` scans that re-run per recompute — O(n) per navigation on large
   manifests (shillinq ships 223 pages).
2. **Silent widget failure.** `CnWidgetGrid` dropped a widget whose `widgetKey`
   resolved to no component, so a page whose widgets all failed to resolve
   rendered a blank pane — the live e2e caught petstore's dashboard rendering
   fully blank because its manifest used `stats-block`, a key the pinned lib
   predated. Nothing surfaced to the user.

## What Changes

- `CnPageRenderer` gains two memoized index computeds (`pageById`,
  `detailPageByRegisterSchema`) rebuilt only when the effective manifest
  changes; `currentPage`, the index row-click wiring, and `onRowOpen` use them
  instead of re-scanning.
- `CnWidgetGrid` renders a visible, designed placeholder (`CnUnknownWidget`)
  for an unresolved `widgetKey` instead of skipping it silently; the dev
  console warning is retained.

## Capabilities

- Modified: `json-manifest-renderer`

## Impact

Rendering is behaviour-preserving for resolvable widgets; the only user-visible
change is that a previously-blank unresolved widget now shows a labelled
placeholder. No API surface change.
