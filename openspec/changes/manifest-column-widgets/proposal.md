# Wire `column.widget` end-to-end + render every table cell through CnCellRenderer

## Why

The manifest schema's `$defs.column` declares a `widget` field — "Optional
cell-widget hint (e.g. `badge`, `link`). Resolves against the consuming app's
cell-widget registry" — but, like `formatter` was before #219, it is inert:
nothing reads it. And `CnDataTable` only routes *schema* columns (`col.type`
present) through `CnCellRenderer`; manifest-declared columns (`pages[].config.columns[]`
are `{key,label,formatter?,widget?}` with no `type`) and legacy manual columns
fall through to plain `{{ value }}` / `formatCell()` — so they get no
type-aware rendering and can't host a widget.

This change finishes the cell-rendering story so the conversion wave can
express status pills, links, and other per-cell components declaratively
instead of hand-rolling a `type:"custom"` table:

1. `column.widget` resolves against a `cellWidgets` registry (`CnAppRoot`
   prop → `provide('cnCellWidgets')`), with a built-in `badge` (renders
   `CnStatusBadge`). Mirrors the `formatters` plumbing from #219.
2. `CnDataTable` renders **every** column through `CnCellRenderer` (passing the
   schema property when available, `{}` otherwise) — unifying rendering and
   removing the `isSchemaColumn` / `formatCell` split. `CnCellRenderer` already
   does the right thing for booleans/enums/dates/arrays/strings when given a
   property, and falls back to `formatValue()` when not. Net effect: manifest
   columns now get type-aware rendering + `formatter` + `widget`; legacy
   manual columns get the same (a small behavior change — boolean cell values
   render as the check-icon, long strings truncate at 100 chars; apps that
   want the raw text keep using `#column-{key}` scoped slots).

## What changes

- **`CnAppRoot`** — new `cellWidgets` prop (`{}` default); `provide('cnCellWidgets', this.cellWidgets)`.
- **`CnCellRenderer`** — new `widget` (id string) and `widgetProps` (object) props; `inject('cnCellWidgets')` (default `() => ({})`). Render order: a `widget` that resolves in `cnCellWidgets` → `<component :is>` with `{value, row, property, formatted, ...widgetProps}`; else `widget === 'badge'` → `<CnStatusBadge :label="String(formattedValue)" :variant="widgetProps.variant || 'default'" />`; else `hasFormatter` → text; else the existing type-aware branches. (When `formatter` and `widget` are both set, the widget renders the formatted value — `formattedValue` already incorporates the formatter.)
- **`CnDataTable`** — one `<CnCellRenderer :value :property :formatter :widget :widget-props :row />` for all columns; drop the `isSchemaColumn` / `formatCell` split (the `#column-{key}` scoped-slot override still wins).
- **No schema bump** — `$defs.column.widget` already exists; add `widgetProps` to `$defs.column` (a small additive field).
- **Docs** — "Column widgets" section in `migrating-to-manifest.md`; `cellWidgets` on `CnAppRoot.md` + `docs/components/cn-app-root.md`; `widget`/`widgetProps` on `CnCellRenderer.md` + `docs/components/cn-cell-renderer.md`.
- **Tests** — `CnCellRenderer.spec.js`: built-in `badge` renders `CnStatusBadge`; a consumer-registered widget renders with `{value, row, property, formatted}`; unknown widget id falls back. `CnDataTable.spec.js`: a column with `widget: "badge"` renders a badge; a schema boolean column renders the icon (regression of the unified path).

## Affected Projects

- [x] Project: nextcloud-vue — `CnAppRoot`, `CnCellRenderer`, `CnDataTable`, schema (`$defs.column.widgetProps`), docs, tests

## Scope

### In scope
- `cellWidgets` registry + built-in `badge`; the unified CnCellRenderer-for-all-columns rendering; `widgetProps` schema field; docs + tests.

### Out of scope
- A built-in `link` / `boolean-toggle` widget (the toggle needs a write path / event contract) — consumers can register those in `cellWidgets` for now; library built-ins are a follow-up.
- `columns[].aggregate` (OR-aggregation/GraphQL-backed count/sum columns) and `actions[].route` — separate changes.

## Risks

### Risk 1: rendering every manual column through CnCellRenderer changes legacy manual-mode output

**Severity**: Low
**Mitigation**: For manifest columns (always paired with a schema) it's strictly an improvement. For pure manual-mode (`columns` set, no `schema`) the only deltas are: boolean cell values → check-icon (was `true`/`false` text), long strings → 100-char truncation with a hover title. Apps that need the raw text use `#column-{key}` slots (already supported, unchanged). Documented in the PR + changelog.

## Rollback

Revert the commit — `widget`/`widgetProps` go back to declared-but-inert and CnDataTable goes back to the schema/manual split.
