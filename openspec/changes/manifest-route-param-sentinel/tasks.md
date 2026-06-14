# Tasks: Manifest `@route.<param>` sentinel

## Phase 1 — Utility

- [x] Add `src/utils/resolveRouteSentinels.js` exporting `resolveRouteSentinels(value, params)`. Walks the input recursively, replacing exact-match `@route.<key>` strings with `params[key]`. Returns a deep-copy with substitutions applied. Arrays + plain objects walked recursively; non-string primitives passed through unchanged.
- [x] Pattern: `^@route\\.([A-Za-z][A-Za-z0-9_-]*)$` — leading letter, alphanumeric + underscore + dash.
- [x] Unresolved sentinels (param absent in `params`) substitute to `null` and emit a single `console.warn` per `(pageId, sentinel)` pair via an internal Set.
- [x] Export a `clearRouteSentinelWarnings()` test-only helper to drop the Set between tests.

## Phase 2 — Renderer

- [x] In `CnPageRenderer.resolvedProps()`, before the readOnly / actionToggles flattens, run `resolveRouteSentinels(config, $route.params, currentPage.id)` to produce the substituted config. Use that result for subsequent merges.

## Phase 3 — Schema

- [x] Bump schema `version` 2.2.0 → 2.3.0.
- [x] Extend the `config` description in `app-manifest-v2.schema.json` to mention `@route.<param>` alongside `@resolve:`.

## Phase 4 — Tests

- [x] `tests/utils/resolveRouteSentinels.spec.js`:
  - top-level string substitutes.
  - nested object substitutes (`filter.catalog`).
  - arrays preserved with per-item substitution.
  - non-sentinel strings pass through.
  - missing param → null + console.warn.
  - non-matching pattern (`@route.foo.bar`, `@route.123abc`) NOT a sentinel — left as literal.
  - `params` undefined → all sentinels → null + warns.

## Phase 5 — Docs

- [x] Add a "Route params in config" section to `docs/migrating-to-manifest.md` (or closest doc) with the PublicationIndex example.
- [x] Cross-link from `cn-index-page.md` and `cn-detail-page.md`.
