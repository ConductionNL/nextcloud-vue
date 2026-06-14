# Manifest `actions[].handler` dispatch

## Why

The OR-abstraction adoption audit (2026-04-26) and the opencatalogi
manifest migration (PR #547, currently open) both flagged the same
load-bearing gap in the manifest renderer: **`actions[]` items
declared in `pages[].config` cannot dispatch to consumer-provided
handlers**. CnIndexPage / CnDetailPage's `actions[]` config drives
the row-action menu, but the only handlers it knows are the
hard-coded built-ins (`view`, `edit`, `copy`, `delete`). Anything
else — open a per-tenant modal, route to a bespoke create flow,
copy via a custom dialog — has to bail out to `type: "custom"` and
hand-roll the page.

Two consumer pressures converged this week:

1. **opencatalogi PR #547** — the migration kept 11 routes as
   `type: "custom"` ONLY because the per-route create / edit / copy
   / delete actions need to drive `navigationStore.setModal()` /
   `setDialog()` instead of CnIndexPage's built-in form/copy/delete
   dialogs. With dispatch, those 11 routes drop to `type: "index"` /
   `type: "detail"`.
2. **pipelinq queue routes (#330 just merged)** — `Queues` and
   `QueueDetail` are `type: "custom"` because the queue create / edit
   flow needs a bespoke dialog (routing-rule editor, capacity, agent
   assignment). With dispatch, both routes drop to `type: "index"` /
   `type: "detail"`.

Hydra ADR-024's lib v2 backlog explicitly tracked
"actions[] dispatch to consumer modal/dialog handlers" as the
**largest unlocker** in the manifest fleet adoption — because every
adopting app hits this the moment they need a non-CRUD row action.

## What Changes

Add a new `handler` field to the `action` $def in the manifest
schema. The field is a **registry name** (string) resolving to a
function in the consumer's `customComponents` registry passed to
`CnAppRoot` / `CnPageRenderer` (the same registry already used to
resolve `headerComponent` / `actionsComponent` / `slots`).

When a row action with `handler` fires, `CnIndexPage` /
`CnDetailPage` look the name up in the registry:

- If the resolved value is a **function**, call it with
  `{ actionId, item }` (and forward to the existing `@action` event
  for back-compat listeners).
- If the resolved value is a Vue component (existing behaviour for
  `headerComponent` etc.), the registry mismatch surfaces a
  `console.warn` and the action falls back to emitting `@action`
  only. We do NOT auto-mount a component for an action handler;
  components belong to slot overrides.
- If the name is **not present** in the registry, the row action
  emits `@action` only (no handler invocation, no warning — this is
  the back-compat path).

Three reserved keywords on `handler` short-circuit the registry
lookup so manifests can declare common semantic actions without
writing a function:

- `"navigate"` — `CnIndexPage` calls `this.$router.push({ name:
  action.route, params: { id: row[rowKey] } })`. The `action.route`
  field is required when `handler === "navigate"`.
- `"emit"` — explicit no-op handler that just bubbles `@action`. Use
  when the consumer wires the side-effect on the parent (the
  default-when-no-handler is identical, but `"emit"` makes the
  intent visible in the manifest).
- `"none"` — disables the action's click. Useful for visibility-only
  rows (rare but lets the schema declare the gate).

Components stay schema-clean: the `handler` field is a
`{ type: "string" }` that pattern-matches the registry-name regex
plus the three reserved keywords. The schema does NOT enumerate
consumer registry names — those are open by definition.

The schema bumps from `1.2.0` to `1.3.0`. v1.2 manifests (no
`actions[].handler`) keep validating and behave exactly as before.

## Problem

Today, `actions[]` items get `id`, `label`, `icon`, `permission`,
`primary`, `confirm` — but NO way to declare what the action
does. The consuming page must:

- Listen for `@action` at the page level,
- Switch on the action's `id` (or `label`),
- Call the right modal / dialog / store method.

This works for one app, but it locks every consumer into writing the
same dispatch boilerplate. The boilerplate is the reason 11
opencatalogi routes and 2 pipelinq routes still bail out to
`type: "custom"`. Without dispatch, the manifest is half-declarative:
the actions are listed but their behaviour is wired in JavaScript
elsewhere.

## Proposed Solution

Promote the `handler` registry-name field to canon. The lib's
`CnIndexPage` and `CnDetailPage` resolve it through the
`customComponents` registry already passed to `CnAppRoot`. Three
reserved keywords (`navigate` / `emit` / `none`) cover the
no-function-needed cases.

The implementation surface is small:

- `src/schemas/app-manifest.schema.json` — add `handler` to the
  `action` $def + bump schema version.
- `src/components/CnIndexPage/CnIndexPage.vue` — extend
  `defaultActions` / `mergedActions` so manifest-declared actions
  with `handler` resolve through the injected registry.
- `src/components/CnDetailPage/CnDetailPage.vue` — same treatment
  for detail-page row actions (where applicable; detail-page
  primary actions inherit the same shape).
- `src/utils/validateManifest.js` — extend `validateActionsArray()`
  to type-check `handler` as a string when present.
- `src/components/CnPageRenderer/CnPageRenderer.vue` — already
  forwards `customComponents` via inject; no change needed beyond
  surfacing it to the page-type components that need it.
- Tests + docs.

The `@action` event on CnIndexPage / CnDetailPage stays. Handlers
fire FIRST, then the event bubbles. This keeps existing listeners
working through the migration.

## Out of scope

- A wiki / form-builder / automation-graph page type (deferred to
  successor changes — see pipelinq's `customComponents.js` lib-gap
  comments).
- Two-way data flow from the handler back into the page (e.g.
  "handler completed, refresh the table"). v1 handlers that need a
  refresh call `store.refresh()` themselves; the page exposes its
  store the same way it does today.
- A formal handler signature contract beyond
  `({ actionId, item }) => void | Promise<void>`. Returning a
  Promise is fine; the page does NOT await it (no spinner UX in v1).

## See also

- Hydra ADR-024 (App manifest fleet-wide adoption) — lib v2 backlog
  row "actions[] dispatch to consumer modal/dialog handlers" — this
  change closes that row.
- ConductionNL/opencatalogi#547 — the load-bearing consumer; 11
  routes pivot from `type:"custom"` to `type:"index"`/`"detail"`
  once this lands.
- ConductionNL/pipelinq#330 (just merged) — Queues + QueueDetail
  are the consumer test-bed for this change's lib PR.
- `src/schemas/app-manifest.schema.json` — `action` $def is the
  single point where `handler` is added.
- `src/components/CnIndexPage/CnIndexPage.vue` — `mergedActions`
  computed is the integration point.
