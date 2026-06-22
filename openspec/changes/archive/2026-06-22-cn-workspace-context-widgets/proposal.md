## Why

Consuming apps (pipelinq's KCC werkplek being the driver) want an "agent workspace" page —
a dashboard where one widget's selection drives the others: pick/create a client in a quick-log
form and that client's history reveals beneath it; type a summary and a knowledge-base widget
follows the live conversation; pick a queue and the work lists narrow. Today the manifest
dashboard widgets are independent — there is no page-level shared state and no widget kinds for
an interaction form or a knowledge search — so apps re-implement the whole thing as bespoke
multi-panel pages with hand-rolled cross-panel reactivity. This change adds the missing library
primitives so a workspace page is purely declarative manifest configuration.

## What Changes

- **NEW** page-level **workspace context** on `CnDashboardPage`: a reactive `ref({})` bag
  `provide`d as `cnWorkspaceContext` (always, like `cnDashboardDateRange`) that widgets on the
  page both write and read — the channel by which one widget drives another. Inert for
  dashboards that don't use it.
- **NEW** `@workspace.<key>` **filter token** in `resolveFilterTokens`: resolves a value off
  `ctx.workspace` so a list widget can filter on page state another widget wrote (e.g.
  `@workspace.selectedClient`). An optional `@workspace.<key>?` form is dropped when unset
  (show all) rather than blocking; a required token left unresolved signals "no selection yet".
  New helpers `hasUnresolvedTokens`, `dropOptionalUnresolved`, `isOptionalUnresolved`.
- **MODIFIED** `CnObjectListWidget`: injects `cnWorkspaceContext`, resolves `@workspace.*`
  tokens, drops optional-unresolved keys, and — when a required token is still unresolved —
  renders a configurable `content.prompt` instead of fetching the whole register.
- **NEW** `interaction-form` dashboard widget kind (`CnInteractionFormWidget`): a quick-log
  form that persists a contactmoment to OpenRegister and writes `selectedClient` +
  `activeSummary` into the workspace context. Its client picker is the new `CnResourceSelect`.
- **NEW** `kb-search` dashboard widget kind (`CnKbSearchWidget`): a summary-driven
  knowledge-base search bound to a workspace key (default `activeSummary`), querying a
  configurable endpoint and degrading gracefully on empty/unavailable responses.
- **NEW** `CnResourceSelect`: an OpenRegister object picker that offers **Create '<term>'**
  inline when the typed term matches no existing object — no dead "no results" path. Exported
  from the barrel.
- **MODIFIED** library barrel, dashboard widget registry registration, docs partials, and
  jsdoc baselines to cover the new surface. No breaking change: the workspace context is
  additive, the new tokens pass through unchanged without context, and `CnObjectListWidget`'s
  prompt path only triggers for `@workspace.*`-bound filters.

## Capabilities

### New Capabilities

- `cn-workspace-context-widgets` — page-level workspace context on dashboards, the
  `@workspace.*` filter token family, the `interaction-form` and `kb-search` widget kinds, and
  the create-from-search `CnResourceSelect`, composing a declarative agent-workspace page.

### Modified Capabilities

- `dashboard-page` — `CnDashboardPage` provides a reactive `cnWorkspaceContext` bag to its
  widget descendants so widgets can share page-level state.
