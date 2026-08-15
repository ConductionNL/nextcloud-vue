# Design — `column.widget` + unified CnCellRenderer cell rendering

## Plumbing (mirrors `cnFormatters`, added in #219)

```
<CnAppRoot :formatters :cell-widgets>      ← NEW prop; provide('cnCellWidgets')
  └─ … → <CnDataTable>                      ← one <CnCellRenderer> per column (was schema/manual split)
            └─ <CnCellRenderer              ← inject('cnCellWidgets'); NEW widget / widgetProps props
                 :value :property :formatter :widget :widget-props :row />
```

## `CnAppRoot.vue`
- Add prop `cellWidgets: { type: Object, default: () => ({}) }` (JSDoc: registry of widget-id → component; built-in `"badge"` handled by CnCellRenderer; component gets `{value,row,property,formatted,...widgetProps}`).
- `provide()` adds `cnCellWidgets: this.cellWidgets`.

## `CnCellRenderer.vue`
- `inject` adds `cnCellWidgets: { default: () => ({}) }`.
- Props add `widget: { type: String, default: null }`, `widgetProps: { type: Object, default: () => ({}) }`.
- Computeds: `hasValue` (not null/undefined/''), `widgetComponent` (`cnCellWidgets[widget]` or null — the built-in `"badge"` is intentionally NOT resolved here so an app can override it via the registry), `badgeVariant` (`widgetProps.variant` or `'default'`).
- Template render order: `widgetComponent` → `<component :is>` with `{value,row,property,formatted: formattedValue, ...widgetProps}`; else `widget === 'badge'` → `<CnStatusBadge>` (or the `—` dash when `!hasValue`); else `hasFormatter` → text; else the existing boolean/enum/array/default branches. `formattedValue` already incorporates `formatter` (added in #219), so a widget paired with a `formatter` receives the formatter output as `formatted`.

## `CnDataTable.vue`
- Remove the `inject: { cnFormatters }` block (only `formatCell` used it).
- Remove the `formatCell()` and `isSchemaColumn()` methods (both only used in the template).
- Cell template: one `<CnCellRenderer :value="getCellValue(row, col.key)" :property="getSchemaProperty(col.key)" :formatter="col.formatter || null" :widget="col.widget || null" :widget-props="col.widgetProps || undefined" :row="row" />` for **all** columns. `getSchemaProperty()` returns `{}` when there's no schema, so CnCellRenderer falls back to `formatValue()` for manual-mode — same end result as the old plain-text path *except* boolean cell values now render as the check-icon and long strings truncate at 100 (documented; `#column-{key}` scoped slots still win, unchanged).
- `getSchemaProperty` JSDoc updated to note the `{}` fallback contract.

## Schema (`src/schemas/app-manifest.schema.json`)
- `$defs.column` already has `widget` (a `string`). Update its description (it's now wired). Add `widgetProps` (`{ type: "object", additionalProperties: true }`). `$defs.column` has `additionalProperties: false`, so `widgetProps` must be listed for a manifest column carrying it to validate. No `version` bump — additive.

## Tests
- `tests/components/CnCellRenderer.spec.js` (extend): built-in `badge` → `CnStatusBadge` (label = value, variant from `widgetProps`); `—` dash when value empty; consumer-registered widget receives `{value,row,property,formatted,...widgetProps}`; widget + formatter → widget gets formatter output as `formatted`; unknown widget id falls back. (Existing formatter tests updated to provide `{ cnFormatters: ... }` instead of the bare `cnFormatters`.)

## Docs
- `docs/migrating-to-manifest.md` — "Column widgets" subsection after "Column formatters" (manifest example, `src/cellWidgets.js`, `:cell-widgets` on CnAppRoot, the manual-mode behaviour note).
- `src/components/CnAppRoot/CnAppRoot.md` + `docs/components/cn-app-root.md` — `cellWidgets` prop row.
- `src/components/CnCellRenderer/CnCellRenderer.md` — `widget` example. `docs/components/cn-cell-renderer.md` — `widget` / `widgetProps` prop rows (the CI doc-coverage check reads `docs/components/`).

## Seed Data
N/A — no OpenRegister schemas/registers introduced or modified.
