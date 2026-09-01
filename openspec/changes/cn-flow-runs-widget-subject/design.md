# Design: cn-flow-runs-widget-subject

## Context

Measured, in the shipped code:

- `CnFlowRunsWidget` binds ONE `useEndpointSource` to
  `/apps/openregister/api/flow-runs/active` with `params: { limit }` and a
  token context of `{ workspace: {}, config: {} }`: no object context, so an
  `@objectId` in its params could never resolve.
- `useEndpointSource` already runs `params` through `resolveFilterTokens`
  against its `ctx` option, and marks a request `blocked` while a REQUIRED
  token stays unresolved (`resolveEndpointRequest`). A blocked request is
  never sent; `data` stays `null` and `error` stays empty.
- The detail surfaces provide the object context as injects:
  `cnObjectContext` (CnDetailPage's config grid, CnAddWidgetModal) and
  `cnDetailObjectContext` (CnPageRenderer's v2 slot grid). The helper
  `resolveObjectTokenContext` merges the two; CnStatWidget, CnChartWidget,
  CnDeltaWidget and CnAuditTrailWidget consume it.
- openregister PR #3250 pins the row contract for both reads: `uuid`,
  `flowName` (id fallback), `step` (null when none), `status`, `created`
  (started at) and the `subject` block; never marking, items or step log.
  The completed read is subject-REQUIRED and serves `FlowRun::TERMINAL`
  (`completed`, `stopped`, `failed`, `dead_letter`) newest first with an
  honest total.

## Goals / Non-Goals

**Goals:**

- One placement line on a case detail manifest that shows the case's live and
  finished runs, without the manifest knowing any uuid.
- A row click that opens the run, when the app has a run page.
- Bit-identical org-wide behaviour when no subject is configured.

**Non-Goals:**

- A per-status count badge, a "show all history" pager, or any read beyond
  the two #3250 specifies.
- Filtering on register or schema: the uuid identifies the case.
- Changes to `useEndpointSource`, `CnDetailPage`, or any file outside the
  widget pair, its registry entry, docs and tests.

## Decisions

### D-1: The context binding is the `@objectId` token, not a boolean flag

The brief offered `content.subjectFromContext` as one option. The library
already has a binding mechanism for exactly this: an object-context token in a
config string, resolved against the injected detail context. CnStatWidget
writes `params: { object: '@objectId' }`; CnAuditTrailWidget scopes its
filter the same way; `useEndpointSource` documents the grammar. A boolean
would be a second mechanism for the same job, would need its own "which
field of the object" story the moment a case anchors runs on something other
than its own uuid, and would not compose with the token resolver a placement
author already knows.

So `content.subject` holds either a literal uuid or a token. The widget
passes the string through untouched in `params.subject` and hands the
endpoint engine a `ctx` built from `resolveObjectTokenContext(
inject('cnObjectContext'), inject('cnDetailObjectContext'))`. A literal uuid
passes `resolveFilterValue` unchanged; `@objectId` resolves to the page's
object id; `@object.<field>` reaches any field on the loaded object.

### D-2: An unresolved token is a loading state, never an empty claim

When the token cannot resolve (context not yet provided, or a subject
placement dropped on a plain dashboard), the engine blocks the fetch. The
widget mirrors that with a `resolvedSubject` computed that yields `null`
while the configured subject still starts with `@`, and renders its loading
indicator in that state. Rendering "No flows have run yet" for a case the
widget has not identified would be false, and rendering the org-wide list
would be worse: a case page showing other cases' runs.

### D-3: Two bindings, one component, one row template

The completed read is a second `useEndpointSource` binding whose source
getter returns `null` when no subject is configured. `useEndpointSource`
treats a null config as "nothing to fetch", so the org-wide widget stays a
single-request surface with no code path change. Both bindings share the
`widgetId` so the per-widget Refresh action refreshes both, and both share
the `limit`: the case widget has one cell budget, not two.

The two lists render the same row markup. The history rows add a
`--terminal` modifier on the row and the dot; nothing else differs, because
the #3250 contract makes the two reads share one row shape.

### D-4: Terminal is a shape and a label, colour is extra

The live dot is filled; the terminal dot is a hollow ring. The history list
sits under an uppercase "Earlier runs" label. The meta line already prints
the status word ("Completed", "Failed", "Stopped", "Failed after retries").
Any one of those survives a monochrome rendering, so the success and error
colours on the ring are reinforcement, not the signal. `dead_letter` gets a
human label rather than the engine's token: a case worker does not know what
a dead letter queue is, and "Failed after retries" is what it means.

### D-5: `runRoute` wins on a uuid, `rowRoute` is the unchanged floor

A row click in subject mode means "show me this run". `runRoute` receives
the run uuid as `:id`. The fallback order is explicit: no `runRoute`, or a
row without a uuid, goes to `rowRoute` with the flow id exactly as the
existing spec requires. `isLinked` (the pointer cursor and the click guard)
is true when either route is configured, so the existing "inert without a
route" behaviour and its test still hold.

### D-6: Two empty lines, one word apart on purpose

`neverRan` is true when a subject is configured, resolved, both reads have
settled without error and both are empty. It renders "No flows have run yet".
When the history has rows and the live list does not, the live slot renders
the existing "No flows are running" line (still overridable by `emptyText`)
above the history. The org-wide widget without a subject never enters either
subject branch and keeps its single empty line.

## Risks / Trade-offs

- **The server side does not exist yet.** Until openregister lands
  `flow-runs-subject-scope`, the active read ignores `subject` (an org-wide
  list under a case heading) and the completed read 404s (one quiet history
  error line). Neither state crashes the page, both are visibly wrong, and
  the PR body says live verification follows the openregister
  implementation. Shipping the consumer first is deliberate: the spec's
  `@e2e` scenarios need both halves, and this half has no other blocker.
- **Two requests per widget instance in subject mode.** #3250's open
  question defers a combined count endpoint until a consumer measures two
  requests as a problem. One case page, one widget, two small reads, polled
  at 15 s and paused on a hidden tab: not that consumer.
- **A leaked terminal row in the active payload.** The widget classes rows
  by the list they came from, not by status, so a server bug that returns a
  completed run as active would render it filled. The engine's status set is
  the server's contract; the widget does not second-guess it.

## Migration Plan

Additive: two new content keys with empty-string defaults in the registry
and the form, one new computed set in the widget. Existing placements keep
their stored content and behaviour. Rollback is removing the two keys; a
stored `subject` on an old widget build is ignored.

## Open Questions

- **Should the history section get its own row limit** (`historyLimit`)?
  Deferred until a case page shows the shared `limit` is the wrong budget for
  one of the two lists.
