# Design: cn-tasks-entity-source

## Context

Measured, in the shipped code and on openregister `development`:

- `indexSources.js` registers one source, `flows`. `useNamedSource` loads it
  once on mount with `props.sourceConfig || {}`, and `CnPageRenderer` never
  sets `sourceConfig`: it spreads `pages[].config` keys as individual props,
  so `config.app` lands as a pass-through attribute and the flows loader
  receives `{}` on every manifest page. App scoping only ever worked through
  an explicit `config.sourceConfig` block.
- Quick filters are self-fetch only. The tab strip renders from the
  `quickFilters` prop, and the refetch watcher lives in `useSelfFetchList`,
  which returns early for named-source pages. A named source had no filter
  surface at all.
- `GET /apps/openregister/api/flow-tasks` (merged with #3258) takes `scope`
  (`assigned|pooled|watched|all`, default assigned), `state` (comma-joined
  CMMN states), `isTerminal`, `priority`, `objectUuid`, `overdue`, `sort`
  (`dueAt|priority|created`, `-` prefix inverts), `limit`, `offset`. It
  answers `{results, total, limit, offset}`. Rows carry the stored task
  (`uuid`, `title`, `state`, `isTerminal`, `assignee`, `priority`, `dueAt`,
  `outcome`, ...) plus derived `displayTitle`, `overdue`, `daysUntilDue`,
  `daysOverdue` and a `subject` block (`uuid`, `register`, `schema`,
  `title`). Verbs are POSTs on `/api/flow-tasks/{uuid}/{verb}`; `complete`
  takes `outcome`, `resultText`, `comment`. Refusals answer
  `{error: message}` with 400, 403, 404 or 409, and a task the caller may
  not read answers 404.
- The six CMMN states are `available`, `enabled`, `active`, `completed`,
  `terminated`, `disabled`. A pooled, claimable task is `enabled` with no
  assignee.
- `CnDataTable` columns render through `CnCellRenderer`: a column with
  `widget: 'badge'` renders `CnStatusBadge` with
  `widgetProps.colorMap` resolved against the shown label.

## Goals / Non-Goals

**Goals:**

- One manifest line for a full inbox page, one for the dashboard widget.
- The viewer's inbox only. Scope, filters, sort and paging are server-side.
- Verb refusals are visible, with the server's own words.

**Non-Goals:**

- The task DETAIL surface. The deep link route is openregister's (#3271);
  this change only navigates to it.
- Repointing `CnTasksTab` / `CnTasksCard` off CalDAV (openregister task
  5.2). That is a follow-up consuming what this change adds.
- Multi-select quick filters for named sources: single mode only.
- Checklist, delegation, audit rendering: the index and the widget list and
  act, they do not replay history.

## Decisions

### D-1: A Pinia store behind the source, the endpoint engine behind the widget

The `flows` source reads a reactive store, and `useNamedSource`'s computeds
track it; the widget family binds `useEndpointSource` for dedupe, refresh
channels and polling. Both precedents hold here: `useTaskInboxStore` is a
small internal store (not exported, not a public API) so the index page gets
reactive rows, while `CnTasksWidget` binds the endpoint engine exactly like
`CnFlowRunsWidget`. One HTTP contract, two consumers with the binding each
surface already uses.

### D-2: The state pill's colour map is keyed on the shown label

`CnStatusBadge` resolves `colorMap` against the rendered label. The source
builds labels and map with the same `t()` calls, so the lookup holds in
every locale, and the label itself still names the state: colour is
reinforcement, never the only carrier.

### D-3: Named-source quick filters live in `useNamedSource`

The alternative was to teach `useSelfFetchList`'s watcher about named
sources. That composable's whole contract is "register+schema, self-fetch";
leaking source reloads into it couples the two data modes. Instead
`useNamedSource` receives the `activeQuickFilterIndex` ref that
`useSelfFetchList` already returns (it owns the ref even when self-fetch is
off), resolves the effective tabs (manifest prop wins, else the source's),
seeds the default tab before mount, loads once on mount with the active
tab's filter merged over `sourceConfig`, and reloads on tab change. The tab
filter spreads last, so a tab can override a `sourceConfig` key, the same
precedence self-fetch gives its tabs.

### D-4: `openRow` because the deep link leaves the app

`namedSource.detailRoute` pushes on the CONSUMING app's router. A task's
detail page is openregister's (`/apps/openregister/flow-tasks/{uuid}`), a
different app entirely, so the source needs a full-URL navigation:
`openRow` wins over `detailRoute` when present, and `row-click` still emits
for hosts that listen. `flows` keeps `detailRoute`; nothing else defines
`openRow`.

### D-5: The renderer bridges `config` to `sourceConfig`

For an `entitySource` page whose config sets no explicit `sourceConfig`,
`resolvedProps` now adds `sourceConfig: {...config}`. The loader picks the
keys it knows and ignores the rest, so `config.app` (flows) and
`config.scope` / `config.state` / `config.priority` / `config.overdue` /
`config.sort` / `config.limit` (tasks) all reach the loader from a purely
declarative page. An explicit `config.sourceConfig` still wins unchanged.

### D-6: The widget's count is a body line, not header chrome

The dashboard surface owns `CnWidgetWrapper` and its `#title-meta` slot;
a registry renderer mounts inside the body and cannot reach the header.
So the count renders as the widget's first line, from the server `total`
(ADR-062: the honest number, not the rendered length). Restyling the
surface contract for one widget is not worth the coupling.

### D-7: Quick actions offer only what the contract can accept

Claim shows on a pooled row (no assignee, not terminal); complete shows on
the viewer's own open row, one entry per declared outcome when the row
carries an `outcomes` list, else a single complete with the server default.
The offer is a heuristic; the server still authorizes. A refusal surfaces
the endpoint's `error` string via `showError` and the widget refetches, so
a lost claim race corrects the row instead of lying about it.

## Risks / Trade-offs

- **The tab strip on named sources reuses `activeQuickFilterIndex`.** Risk:
  self-fetch and named-source modes fight over the ref. They cannot both be
  active (`useSelfFetchList` bails when `entitySource` is set), so exactly
  one consumer watches it per page.
- **Seeding the default tab index in setup, before the watcher.** The load
  on mount already carries the seeded tab's filter, so the seed must not
  also trigger the watcher; registering the watcher after the seed keeps it
  to one request. A test pins the single-load behaviour.
- **`isTerminal: 'false'` on the widget's read.** An inbox widget that
  showed completed tasks would never drain. The index page's "everything"
  tab still shows terminal rows for audit reading.

## Open Questions

- None blocking. The deep link 404s until openregister #3271 merges; the
  source and widget consume nothing else from that PR.
