# Wire `column.formatter` end-to-end (CnDataTable / CnCellRenderer ← consumer formatter registry)

## Why

The app-manifest schema's `$defs.column` already declares a `formatter`
field — "Optional cell-formatter id (e.g. `date`, `currency`). Resolves
against the consuming app's formatter registry" — and `pages[].config.columns[]`
admits it. But the field is **inert**: `CnCellRenderer` does its own
fixed type-aware rendering and never looks at `column.formatter`, and no
formatter registry is plumbed through `CnAppRoot`. So a manifest-driven
index page can't say "render the `trigger` column via the `automationTrigger`
formatter" — the app has to fall back to a bespoke `type:"custom"` view
that hand-rolls the table just to format one column.

This is the lever for the fleet's "as little custom code as possible"
goal: app-specific *value formatting* (`triggerLabel(trigger)`, "days in
step", currency, status-label maps, …) should live in small pure data
functions the app registers, not in per-page `.vue` files — keeping the
Vue layer (`CnIndexPage` / `CnDataTable`) abstract and reusable.
(`columns[].aggregate` for related-object counts/sums via OpenRegister
aggregations / GraphQL, and a `columns[].widget` cell-component registry
for badges/links/inline-toggles, are the natural follow-ups — out of
scope here so this change stays small and low-risk.)

## What changes

- **`CnAppRoot`** — new `formatters` prop (`{}` default); `provide('cnFormatters', this.formatters)`. Mirrors the existing `customComponents` / `pageTypes` plumbing.
- **`CnCellRenderer`** — new `formatter` prop (formatter-id string) and `row` prop (the full row object); `inject('cnFormatters')` (default `() => ({})`). When `formatter` is set and `cnFormatters[formatter]` is a function, the cell value is `cnFormatters[formatter](value, row, property)`; otherwise the existing type-aware rendering is unchanged.
- **`CnDataTable`** — `inject('cnFormatters')`; pass `:formatter="col.formatter"` + `:row="row"` to `CnCellRenderer` for schema columns; for manual columns, route the cell value through a new `formatCell(row, col)` helper (formatter if set, raw value otherwise) instead of the raw `getCellValue`.
- **No schema bump** — `$defs.column.formatter` already exists and `validateManifest` already admits it.
- **Docs** — add a "Column formatters" section to `docs/migrating-to-manifest.md`, document the `formatters` prop on `cn-app-root.md`, note the resolution in `CnCellRenderer.md`.
- **Tests** — `tests/components/CnCellRenderer.spec.js`: a named formatter resolves and runs; an unknown id falls back to type-aware rendering; no `cnFormatters` provide ⇒ falls back.

## Affected Projects

- [x] Project: nextcloud-vue — `CnAppRoot`, `CnCellRenderer`, `CnDataTable`, docs, tests
- [ ] No other repos in this change; consumer apps adopt the `formatters` prop in follow-ups (e.g. pipelinq's `automationTrigger` formatter so `Automations` keeps its readable Trigger column).

## Scope

### In scope
- The `formatters` registry prop + provide on `CnAppRoot`.
- `column.formatter` resolution in `CnCellRenderer` (schema-column path) and `CnDataTable` (manual-column path).
- Docs + tests.

### Out of scope
- `columns[].aggregate` (OR-aggregation / GraphQL-backed computed columns) — follow-up `manifest-column-aggregates`.
- `columns[].widget` cell-component registry (built-in `badge`/`link` + consumer overrides) — follow-up `manifest-column-widgets`.
- `actions[].route` (declarative navigation row-actions) — follow-up.
- Plumbing `formatters` through `CnPageRenderer` when used standalone (without `CnAppRoot`) — current change relies on the `CnAppRoot` → `CnCellRenderer` provide/inject chain, which covers every fleet app's setup.
- Changing `columnsFromSchema()` — the manifest path passes columns through verbatim, so `formatter` rides along untouched.

## Approach

Provide/inject, mirroring `cnCustomComponents` / `cnPageTypes`. `CnAppRoot`
provides `cnFormatters`; `CnDataTable` and `CnCellRenderer` inject it (with
an empty-object default so standalone use is unaffected). `CnCellRenderer`
gains the column's `formatter` id + the `row` so a formatter can be
`(value, row, property) => string`. Backwards compatible: a column with no
`formatter`, or an app that passes no `formatters`, renders exactly as today.

## Risks

### Risk 1: a buggy consumer formatter throws and blanks the table

**Severity**: Low
**Mitigation**: `CnCellRenderer` wraps the formatter call in try/catch; on
throw it logs `console.warn` and falls back to the type-aware rendering for
that cell. One bad formatter degrades one column, never the page.

## Rollback

Revert the commit — the `formatter` field stays declared-but-inert (as it is
today) and nothing else changes.
