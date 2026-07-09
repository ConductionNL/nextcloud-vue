# Manifest detail lifecycle actions

## Why

A conversion audit of pipelinq's bespoke detail pages found that the
biggest hand-coded views (the POS detail pages — PosTransactionDetail,
PosRefundDetail, CashShiftDetail, ZReportDetail, BookingDetail — plus
others) stay `type:"custom"` for one structural reason: the page has to
render **status-gated action buttons** ("Close shift", "Void", "Reconcile",
…). CnDetailPage can already render a schema-driven body, a sidebar, and
grid widgets, but it has no declarative way to express "for the object's
current `status`, show a button per allowed lifecycle transition; clicking
it performs the transition and reloads the object".

OpenRegister already owns the lifecycle: schemas declare
`x-openregister-lifecycle` (a `{ field, transitions: { <action>: { from,
to, requires?, description? } } }` graph), and there are two HTTP entry
points — `GET /api/objects/{id}/available-actions` (returns the transitions
allowed from the object's current state) and `POST
/api/objects/{id}/transition` (applies one, with the listener
re-validating server-side and returning a 403/422 on rejection). Every
leaf app re-implements its own action endpoints + buttons instead of
consuming this.

This change adds a declarative `lifecycleActions` config block to
`type:"detail"` pages so a manifest author writes the transition buttons
once and the library drives the OR lifecycle — removing the single biggest
reason those POS pages remain bespoke.

## What changes

- **New component `CnLifecycleActions`** — given an `objectId`, the loaded
  `object`, and a `config`, it renders one button per allowed transition.
  Two modes: server-derived (default — fetches `/available-actions`, the
  source of truth) and config-declared (an explicit `transitions` array
  filtered client-side by the object's current state, for static labels /
  confirm prompts). Clicking POSTs to `/transition`, emits `transitioned` +
  `reload`, and surfaces a server rejection inline.
- **`CnDetailPage.lifecycleActions` prop** (Object | null, default `null`)
  — when set, the page mounts `CnLifecycleActions` in its header, forwards
  the page's object id + loaded object, re-fetches the object on `reload`,
  and re-emits `transitioned`. Omitting it (default) keeps current
  behaviour exactly — additive and backwards-compatible.
- Manifest `config.lifecycleActions` flows straight through CnPageRenderer
  (which already spreads `config.*` as props), so no renderer change.

## Impact

- Affected components: `CnDetailPage` (new optional prop + event),
  `CnLifecycleActions` (new public export).
- No breaking change: pages without `lifecycleActions` are untouched.
- Consumers: pipelinq POS detail pages can drop bespoke action wiring.
