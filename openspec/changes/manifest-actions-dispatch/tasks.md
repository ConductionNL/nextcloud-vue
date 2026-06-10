# Tasks: Manifest `actions[].handler` dispatch

## Phase 1 — Schema + validator

- [x] Add `handler` field to the `action` $def in `src/schemas/app-manifest.schema.json`. Type `string`; pattern `^(navigate|emit|none|[A-Za-z][A-Za-z0-9_]*)$`; description points at the customComponents registry resolution.
- [x] Add `route` field to the same $def (required when `handler === "navigate"`; ignored otherwise). Type `string`.
- [~] Bump `version` in the schema from `1.2.0` to `1.3.0` (schema is now at `1.5.0` — superseded by later changes; handler/route are already in the live schema)
- [x] Extend `validateActionsArray()` in `src/utils/validateManifest.js` to type-check `handler` as a string when present and reject values failing the pattern.
- [x] Extend `validateActionsArray()` to require `route` when `handler === "navigate"`.

## Phase 2 — Lib runtime: CnIndexPage + CnDetailPage

- [x] Inject `cnCustomComponents` into `CnIndexPage` (or accept it via prop with the same fallback chain as `CnPageRenderer`).
- [x] Add a `resolveHandler(action)` method that maps `action.handler` to a `(row) => void` invocation function (implemented as `resolveActionHandler` in `src/components/CnIndexPage/manifestActionDispatch.js`):
  - `typeof action.handler === 'function'` → use as-is (back-compat for runtime / programmatic actions).
  - `'navigate'` → `this.$router.push({ name: action.route, params: { id: row[rowKey] } })`.
  - `'emit'` / `'none'` → null (page emits `@action`; `'none'` disables click in `CnRowActions.onAction`).
  - registry name → look up in `effectiveCustomComponents`; if it's a function, wrap as `(row) => fn({ actionId: action.id, item: row })`. If it's a non-function, console.warn and fall back to null.
  - missing name → null (silent fall-through to `@action`-only).
- [x] Update the `mergedActions` computed to wire `handler` through `resolveHandler` so `CnRowActions` sees the same `{ handler: fn }` shape it does today.
- [x] (REQ-MAD-8) Confirm CnDetailPage's existing `cnCustomComponents` inject path keeps working when a `CnIndexPage` is nested inside a detail page (no extra wiring needed — the inject is provided by `CnAppRoot`).

## Phase 3 — Tests

- [x] Add `tests/components/CnIndexPageActionsDispatch.spec.js` covering:
  - manifest action with `handler: "myHandler"` resolves through `customComponents` and the function is called with `{ actionId, item }` on click.
  - missing handler name silently falls back to `@action`-only.
  - registry name resolving to a non-function logs a `console.warn` and falls back.
  - reserved keyword `navigate` calls `$router.push` with the right name + id param.
  - reserved keyword `emit` skips the handler call but still emits `@action`.
  - reserved keyword `none` skips the handler call AND skips the `@action` emit.
  - back-compat: `handler: function` (programmatic prop) still fires.
- [x] Add manifest-validator tests in `tests/schemas/app-manifest-refs.spec.js`:
  - action with `handler: "myFn"` validates.
  - action with `handler: "navigate"` + `route: "Foo"` validates.
  - action with `handler: "navigate"` missing `route` rejects.
  - action with `handler: "with-dash"` rejects (pattern violation).
- [x] Add a fixture under `tests/fixtures/` covering the new `handler` + `route` shape; assert validator returns valid (covered inline in `tests/schemas/app-manifest-refs.spec.js`).

## Phase 4 — Documentation

- [x] Update `src/components/CnIndexPage/CnIndexPage.md` with an "Action handlers" section showing a manifest declaring `handler: "openMyModal"` and the matching registry entry.
- [x] Update `src/components/CnDetailPage/CnDetailPage.md` with the same section (cross-references the CnIndexPage section).
- [x] Update `docs/migrating-to-manifest.md` (if present) with a "When to migrate from `type:custom` to `type:index` via handlers" section pointing at the opencatalogi #547 + pipelinq queue patterns.
- [~] Run `npm run check:docs` and resolve any coverage failures (deferred to CI — node_modules not installed in this worktree).

## Phase 5 — Consumer migration (pipelinq queues)

- [~] In the pipelinq worktree, install the lib via `npm install /path/to/local-tarball.tgz` so the new schema/runtime is available (out-of-scope for this library worktree — consumer-app work; the lib side is complete).
- [~] Convert `Queues` route from `type: "custom"` to `type: "index"` in `src/manifest.json` (pipelinq-side consumer migration — out of scope).
- [~] Convert `QueueDetail` route from `type: "custom"` to `type: "detail"` similarly (pipelinq-side consumer migration — out of scope).
- [~] Add `queueProcessHandler` (and any siblings) to `src/customComponents.js` as exported functions (pipelinq-side).
- [~] Run `node tests/validate-manifest.js`, `npx eslint src/manifest.json src/customComponents.js`, `npx webpack --mode production` until all clean (pipelinq-side).

## Phase 6 — Browser verification

- [~] Navigate to `http://localhost:8080/index.php/apps/pipelinq/queues` in the browser-pool session (browser verification deferred — depends on pipelinq-side consumer migration above).
- [~] Verify the page renders as `CnIndexPage` (DOM shows `.cn-index-page`) (deferred).
- [~] Click a row's "Process" action; confirm the handler fires (deferred).
- [~] Confirm no `Vue.extend _Ctor` errors in the console (deferred).
- [~] Capture a screenshot and attach to the consumer PR description (deferred).
