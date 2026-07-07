# Canonical widget dialect + convergence codemod

Audit items 11/25 — *"the fleet has forked into two widget dialects, three
data-binding spellings, three sidebar shapes"* (MANIFEST-AUDIT-2026-07-06).
This document defines the single canonical widget dialect and the idempotent
`manifest-migrate` transforms that converge every legacy shape onto it.

## The one canonical widget shape

Every widget on **every** page type (dashboard, index, detail, settings, …) is a
single uniform entry in a top-level `widgets[]` array:

```jsonc
{
  "widgetKey": "stat",     // widget identity (was dialect-B `type`)
  "slot": "body",          // body | sidebar | header-actions | footer | modal | tab:* | section:*
  "gridX": 0,              // 0-based column start
  "gridY": 0,              // row start
  "gridWidth": 3,          // column span (gridX + gridWidth <= 12)
  "gridHeight": 2,         // row span
  "props": { … },          // presentation props (title, columns, …)
  "dataSource": "…"        // the SOLE data-binding key (string or object)
}
```

> **Grid key names.** The convergence change refers to the coordinates as
> `gridX/Y/W/H` in shorthand. The **actual v2 schema keys** are `gridX`,
> `gridY`, `gridWidth`, `gridHeight` — the codemod emits those so its output
> validates against `app-manifest-v2.schema.json`.

Rules:

- **Placement is inline on the entry.** There is no parallel `config.layout[]`
  placement array.
- **`dataSource` is the only data-binding key.** Never `content.source`, never a
  bare `source` on the entry. (The built-in `object-table` / `card-grid`
  widgets keep their own `props.source` query contract — that is a *widget prop*,
  not the widget-entry binding, and is out of scope for the rename.)
- **Sidebar widgets** are `widgets[]` entries with `slot: "sidebar"` and an
  optional `tabGroup` naming their tab. Never `config.sidebarProps.tabs`,
  `config.sidebarTabs`, or a `config.sidebar` object with `tabs`.
- **A dashboard** is `type: "dashboard"` with a `widgets[]` array. Never a
  `type: "custom"` bespoke Vue component.

No manifest carries two dialects; no page mixes `dataSource` with an alias.

## Dialect-B (the shape being retired)

Dialect-B splits a widget across a typed def and a separate placement row:

```jsonc
// config.widgets[]  (or top-level widgets:[{id,type}])
{ "id": "w1", "type": "stat", "title": "Open" }
// config.layout[]
{ "widgetId": "w1", "gridX": 0, "gridY": 0, "gridWidth": 3, "gridHeight": 2 }
```

## The codemod transforms

`manifest-migrate` runs these as an idempotent **convergence pass** — after the
v1→v2 mechanical rules for a v1 input, and as the *only* pass for a manifest
already declaring the v2 `$schema`. Re-running on a canonical manifest is a
byte-identical no-op.

| # | Transform | File | What it does |
|---|-----------|------|--------------|
| 2.1 | `convergeTypedWidgets` | `src/cli/transforms/convergeTypedWidgets.js` | Folds dialect-B `config.widgets[]` (or top-level `widgets:[{id,type}]`) + `config.layout[]` into canonical `widgets[]`: `type`→`widgetKey`, grid folded inline, `config.layout`/`config.widgets` removed. Accepts both `gridWidth/gridHeight` and terse `w/h`. |
| 2.2 | `renameDataSourceKeys` | `src/cli/transforms/renameDataSourceKeys.js` | Renames entry-level `content.source` / bare `source` → `dataSource`. Never touches `props.source`. |
| 2.3 | `normalizeSidebarShapes` | `src/cli/transforms/normalizeSidebarShapes.js` | Lifts `sidebarProps.tabs` / `sidebarTabs` / `sidebar.tabs` widget-bearing tabs → `slot:"sidebar"` + `tabGroup`. Component-only tabs are **flagged for manual review and retained** — never dropped. |
| 2.4 | `promoteCustomDashboard` | `src/cli/transforms/promoteCustomDashboard.js` | Promotes `type:"custom"` pages whose component is a known bespoke dashboard (`Dashboard`, `DashboardIndex`, `DashboardView`, `DashboardCustomView`, `ScholiqDashboards`) to `type:"dashboard"`. Bespoke logic with no manifest-widget expression is flagged (component name preserved), never silently dropped. |

Each transform is unit-tested for correct conversion, unconvertible-flagging,
and idempotence (`tests/cli/transforms/*.test.js`); the fleet mixed-dialect
regression lives in `tests/cli/convergence.test.js`.

## Usage

```sh
# Converge an already-v2 manifest in place (idempotent):
node src/cli/manifest-migrate.js --input src/manifest.json --report migration.md
```

## Renderer reconciliation (open — nc-vue task 4.1)

The renderer alias read paths (`CnPageRenderer` / `CnWidgetGrid` /
`CnDetailPage`) still read **both** dialects and MUST stay until the fleet has
converged.

> **Detail-page caveat.** `CnPageRenderer` currently renders a bare
> `CnWidgetGrid` for any page whose `body` slot has widgets, **instead of**
> mounting the typed component (`CnDetailPage`). For a detail page that means
> the surrounding chrome — metadata sidebar, `summaryAggregates`,
> `relatedCollections`, lifecycle/header actions — is only rendered by
> `CnDetailPage` and is bypassed when detail widgets move into `widgets[]`
> `slot:"body"`. Converging a detail page's widgets is therefore **not**
> render-parity-safe until `CnPageRenderer` mounts `CnDetailPage` as a shell
> around body-slot widgets (or `CnDetailPage` consumes canonical `slot:"body"`
> widgets directly). Track this as renderer reconciliation task 4.1; do not
> merge a per-app detail-page convergence PR before it lands.

Once a shape is retired fleet-wide, its `page.config` alias keys are promoted in
`app-manifest-v2.schema.json` from `additionalProperties:true` to enumerated
(warn → reject), and the renderer alias read paths are removed.
