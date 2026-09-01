---
kind: code
---

# Proposal: cn-flow-runs-widget-subject

## Summary

Make `CnFlowRunsWidget` usable on a case detail page. A new `content.subject`
option scopes the widget to ONE subject object: the live list is filtered to
that subject server-side, and the subject's finished runs render below it as
history. A new `content.runRoute` option turns a row into a deep link to the
RUN (the route receives the run uuid), with the existing `rowRoute` flow-id
behaviour as the unchanged fallback. This is the consumption half of the
openregister change `flow-runs-subject-scope` (openregister PR #3250), whose
row contract and two reads this widget consumes.

## Why

**A case page cannot show its own runs today.** The widget reads the
org-wide `flow-runs/active` surface and nothing else. A dossiq case whose
hersteltermijn flow is suspended on a resident has no view of that run from
the case itself; the only place it shows is the org dashboard, mixed with
every other case. The openregister side now specifies a `subject` filter on
the live read and a subject-required completed-runs read. Without a consumer,
those reads answer nobody.

**A finished flow must not look like nothing happened.** On a dashboard,
"nothing running" is the normal, honest state. On a case page it is a lie by
omission: the flow ran, completed, and the case shows an empty line. The
history half is therefore not optional in subject mode.

**A manifest must not hardcode a uuid.** A case detail placement is authored
once per app, not once per case. The widget has to bind the CURRENT object
from the page it sits on, the same way the other endpoint-bound widgets
already do.

## What Changes

- **`content.subject`**: a subject object uuid, or the object-context token
  `@objectId` (or `@object.<field>`). When set, the active read carries
  `subject` and a second read on `flow-runs/completed` runs for the same
  subject. Both requests share the row limit.
- **Token binding through the detail page's injected object context**:
  `cnObjectContext` / `cnDetailObjectContext`, resolved with the shared
  `resolveObjectTokenContext` and the endpoint engine's own token grammar.
  An unresolved token blocks the fetch (the engine's existing `blocked`
  semantics) and the widget shows its loading state, never an empty claim.
- **History rendering**: terminal rows (`completed`, `stopped`, `failed`,
  `dead_letter`) sit under their own "Earlier runs" label with a hollow dot
  and a muted name; the distinction never rests on colour alone. The
  remainder is stated from the completed read's honest total.
- **Two empty states**: a subject with no runs at all says "No flows have run
  yet"; a subject with history but nothing live keeps the "No flows are
  running" line above its history.
- **`content.runRoute`**: a row with a run uuid opens this route with the uuid
  as `:id`. A row without a uuid, or a placement without `runRoute`, falls
  back to `rowRoute` with the flow id exactly as before.
- **`CnFlowRunsWidgetForm`** learns `subject` and `runRoute`; the registry
  default content gains both keys as empty strings.
- **Polling** refetches both reads while a subject is configured, so a run
  that finishes between polls moves to history instead of vanishing.

## What does NOT change

- **The org-wide widget.** Without `subject` the widget issues the same single
  request with the same params, renders the same rows, empty line and
  remainder, and `rowRoute` behaves identically. Every existing unit test
  passes unmodified.
- **Polling, honest totals and `visibilitychange` handling.** Same interval
  rules, same floor, same pause on a hidden tab; the history read simply
  joins the refetch.
- **The endpoint addresses.** Still constants, still not configuration.
- **Existing props.** Every new option has a default and lives inside the
  existing `content` blob.

## Capabilities

### New Capabilities

- `cn-flow-runs-widget-subject`: subject scoping, history rendering, the two
  empty states, object-context token binding, and the run deep link.

### Modified Capabilities

<!-- None. cn-flow-runs-widget's requirements all hold unchanged; the run
     deep link is additive and only engages when `runRoute` is configured. -->

## Impact

- **Affected specs**: new `cn-flow-runs-widget-subject`.
- **Affected code**: `src/components/CnFlowRunsWidget/CnFlowRunsWidget.vue`,
  `src/components/CnFlowRunsWidget/index.js`,
  `src/components/CnFlowRunsWidgetForm/CnFlowRunsWidgetForm.vue`, the two
  docs pages and their generated partials.
- **Affected apps**: dossiq's case detail page first; any app whose detail
  page anchors runs to an object can place the widget with
  `subject: '@objectId'`.
- **Depends on**: the openregister implementation of `flow-runs-subject-scope`
  for live behaviour. Until it lands, `subject` is ignored by the active read
  and the completed read 404s; the widget's unit tests mock both per the
  #3250 contract, and live verification follows that implementation.
- **ADRs**: ADR-022 (the widget consumes the OR read instead of each app
  building a run query), ADR-062 (honest totals, quiet empty and error
  lines), ADR-098 D4 (the case anchor is the OR object).
