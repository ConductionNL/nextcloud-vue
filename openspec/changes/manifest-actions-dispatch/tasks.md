# Tasks: Manifest `actions[].handler` dispatch

## Phase 1 — Schema + validator

- [ ] Add `handler` field to the `action` $def in `src/schemas/app-manifest.schema.json`. Type `string`; pattern `^(navigate|emit|none|[A-Za-z][A-Za-z0-9_]*)$`; description points at the customComponents registry resolution.
- [ ] Add `route` field to the same $def (required when `handler === "navigate"`; ignored otherwise). Type `string`.
- [ ] Bump `version` in the schema from `1.2.0` to `1.3.0`.
- [ ] Extend `validateActionsArray()` in `src/utils/validateManifest.js` to type-check `handler` as a string when present and reject values failing the pattern.
- [ ] Extend `validateActionsArray()` to require `route` when `handler === "navigate"`.

## Phase 2 — Lib runtime: CnIndexPage + CnDetailPage

- [ ] Inject `cnCustomComponents` into `CnIndexPage` (or accept it via prop with the same fallback chain as `CnPageRenderer`).
- [ ] Add a `resolveHandler(action)` method that maps `action.handler` to a `(row) => void` invocation function:
  - `typeof action.handler === 'function'` → use as-is (back-compat for runtime / programmatic actions).
  - `'navigate'` → `this.$router.push({ name: action.route, params: { id: row[rowKey] } })`.
  - `'emit'` / `'none'` → null (page emits `@action`; `'none'` disables click in `CnRowActions.onAction`).
  - registry name → look up in `effectiveCustomComponents`; if it's a function, wrap as `(row) => fn({ actionId: action.id, item: row })`. If it's a non-function, console.warn and fall back to null.
  - missing name → null (silent fall-through to `@action`-only).
- [ ] Update the `mergedActions` computed to wire `handler` through `resolveHandler` so `CnRowActions` sees the same `{ handler: fn }` shape it does today.
- [ ] (REQ-MAD-8) Confirm CnDetailPage's existing `cnCustomComponents` inject path keeps working when a `CnIndexPage` is nested inside a detail page (no extra wiring needed — the inject is provided by `CnAppRoot`).

## Phase 3 — Tests

- [ ] Add `tests/components/CnIndexPageActionsDispatch.spec.js` covering:
  - manifest action with `handler: "myHandler"` resolves through `customComponents` and the function is called with `{ actionId, item }` on click.
  - missing handler name silently falls back to `@action`-only.
  - registry name resolving to a non-function logs a `console.warn` and falls back.
  - reserved keyword `navigate` calls `$router.push` with the right name + id param.
  - reserved keyword `emit` skips the handler call but still emits `@action`.
  - reserved keyword `none` skips the handler call AND skips the `@action` emit.
  - back-compat: `handler: function` (programmatic prop) still fires.
- [ ] Add manifest-validator tests in `tests/schemas/app-manifest-refs.spec.js`:
  - action with `handler: "myFn"` validates.
  - action with `handler: "navigate"` + `route: "Foo"` validates.
  - action with `handler: "navigate"` missing `route` rejects.
  - action with `handler: "with-dash"` rejects (pattern violation).
- [ ] Add a fixture under `tests/fixtures/` covering the new `handler` + `route` shape; assert validator returns valid.

## Phase 4 — Documentation

- [ ] Update `src/components/CnIndexPage/CnIndexPage.md` with an "Action handlers" section showing a manifest declaring `handler: "openMyModal"` and the matching registry entry.
- [ ] Update `src/components/CnDetailPage/CnDetailPage.md` with the same section.
- [ ] Update `docs/migrating-to-manifest.md` (if present) with a "When to migrate from `type:custom` to `type:index` via handlers" section pointing at the opencatalogi #547 + pipelinq queue patterns.
- [ ] Run `npm run check:docs` and resolve any coverage failures.

## Phase 5 — Consumer migration (pipelinq queues)

- [ ] In the pipelinq worktree, install the lib via `npm install /path/to/local-tarball.tgz` so the new schema/runtime is available.
- [ ] Convert `Queues` route from `type: "custom"` to `type: "index"` in `src/manifest.json`. Add `actions: [{id: "process", label: "Process queue", handler: "queueProcessHandler"}, ...]`.
- [ ] Convert `QueueDetail` route from `type: "custom"` to `type: "detail"` similarly with detail-page actions.
- [ ] Add `queueProcessHandler` (and any siblings) to `src/customComponents.js` as exported functions.
- [ ] Run `node tests/validate-manifest.js`, `npx eslint src/manifest.json src/customComponents.js`, `npx webpack --mode production` until all clean.

## Phase 6 — Browser verification

- [ ] Navigate to `http://localhost:8080/index.php/apps/pipelinq/queues` in the browser-pool session.
- [ ] Verify the page renders as `CnIndexPage` (DOM shows `.cn-index-page`).
- [ ] Click a row's "Process" action; confirm the handler fires (visible side-effect or `console.log` from the handler).
- [ ] Confirm no `Vue.extend _Ctor` errors in the console.
- [ ] Capture a screenshot and attach to the consumer PR description.
