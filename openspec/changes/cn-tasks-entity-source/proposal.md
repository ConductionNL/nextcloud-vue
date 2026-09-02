---
kind: code
---

# Proposal: cn-tasks-entity-source

## Summary

Give the library a named `tasks` entity source and a `tasks` dashboard widget.
An app's task inbox then becomes one manifest line, a `type: "index"` page
with `config.entitySource: "tasks"`, plus one widget placement. No app ships
a bespoke Vue page for its inbox any more. This is the consumption half of
openregister's `flow-task-entity` (PR #3258, merged) and unblocks tasks 5.1
and 5.2 of `flow-task-inbox-projections` (PR #3271).

## Why

**ADR-098 asks for one fleet-wide inbox surface.** Every Conduction app runs
its human tasks on OpenRegister's one task store. "What is waiting for me"
therefore has a single answer per viewer, exactly like the flow runs the
`flow-runs` widget already reads. Without a shared surface each app grows its
own task page, and the fleet gets twenty task pages that disagree.

**The named-source registry knows exactly one source.** `indexSources.js`
holds `flows` and nothing else. openregister's task 5.1 is blocked on this
in writing: declaring `entitySource: "tasks"` today renders an empty index
with a console warning, which is worse than no page.

**The endpoint is live.** `GET /apps/openregister/api/flow-tasks` answers on
openregister `development` with server-side scope, filters, sort, paging and
an honest datastore `total`, plus lifecycle verbs that refuse with 403, 404
and 409. The consumer's job is to forward the query and render what comes
back, never to filter a returned page client-side.

## What Changes

- **`tasks` in `indexSources.js`**: a source adapter backed by a small
  internal Pinia store that reads `/apps/openregister/api/flow-tasks`.
  Columns (task, subject, state pill, priority, due with overdue wording,
  assignee), default sort `-dueAt`, scope defaulting to `assigned`, quick
  filters (assigned, pool, watched, everything, overdue), a row click that
  opens the task's deep link, and no Add button, because a task is created
  by a flow, never by a person clicking Add. The source resolves the CURRENT
  user's inbox: authorization is the endpoint's, and the source never asks
  for another user.
- **Named sources gain three small page hooks**, each with `flows` semantics
  unchanged: a source may supply `quickFilters` (a manifest that declares its
  own still wins), `openRow` (a row click handler for rows whose detail lives
  outside the consuming app's router), and `showAdd: false`.
- **`CnPageRenderer` hands `pages[].config` to the source loader** as
  `sourceConfig` for `entitySource` pages that do not set one explicitly.
  Until now the flows source's `app` scoping only worked when a manifest
  spelled out `config.sourceConfig` by hand.
- **`CnTasksWidget`** (registry type key `tasks`): the viewer's open tasks
  on `CnWidgetWrapper` with the shared Actions menu. A count line states the
  server total, rows carry due and overdue by wording and shape, never by
  colour alone, the empty state is distinct from the failed state, and it
  polls like `CnFlowRunsWidget`. Quick actions where the contract allows:
  claim on a pooled task, complete with an outcome when the row carries
  outcomes. A refused verb (403, 404, 409) surfaces the server's message as
  a toast, never silently. `content` options: `{scope, limit, pollSeconds,
  rowRoute?, emptyText?}`, configured by **`CnTasksWidgetForm`**.
- **Manifest schema**: `config.entitySource` enum gains `"tasks"` in
  `src/schemas/app-manifest-v2.schema.json`. The hydra-gates canonical copy
  (`ConductionNL/.github`, `hydra-gates/scripts/schemas/
  app-manifest-v2.schema.json`, same JSON path) needs the same one-word
  change in its own PR; a widget type is not a schema enum, so the widget
  itself needs no third home beyond the registry and this repo's exports.

## What does NOT change

- **The `flows` source.** Same adapter fields, same load, no quick filters,
  no `openRow`, Add still navigates to the editor.
- **Self-fetch and consumer-managed index pages.** The quick-filter refetch
  path for register+schema pages is untouched; the named-source wiring only
  engages when `entitySource` is set.
- **The endpoint addresses.** Constants in the store and the widget, not
  configuration.

## Capabilities

### New Capabilities

- `cn-tasks-entity-source`: the source adapter, the three named-source page
  hooks, the renderer's `sourceConfig` bridge, the widget, its form, and the
  schema enum entry.

## Impact

- **Affected code**: `src/composables/indexSources.js`, new
  `src/composables/useTaskInboxStore.js`, `src/components/CnIndexPage/
  {CnIndexPage.vue,useNamedSource.js}`, `src/components/CnPageRenderer/
  CnPageRenderer.vue`, new `src/components/CnTasksWidget/` and
  `src/components/CnTasksWidgetForm/`, `src/utils/widgetDispatch.js`,
  `src/components/CnWidgetGrid/registerDashboardWidgets.js`, the barrel
  exports, the v2 schema, l10n, docs and tests.
- **Affected apps**: openregister first (tasks 5.1 and 5.2 of
  `flow-task-inbox-projections`); any app can then declare the page and the
  widget from its manifest.
- **Depends on**: openregister `flow-task-entity` (merged) for live data.
  The deep link page `/apps/openregister/flow-tasks/{uuid}` ships with the
  still-open PR #3271; until it lands the deep link 404s, and the source's
  row click is the only consumer.
- **ADRs**: ADR-098 (one inbox surface, the case anchor is the OR object),
  ADR-022 (apps consume OR abstractions), ADR-062 (honest totals, quiet
  empty and error lines).
