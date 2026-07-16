# Tasks — `column.widget` + unified CnCellRenderer cell rendering

## 1. CnAppRoot — cellWidgets registry
- [x] 1.1 Add `cellWidgets: { type: Object, default: () => ({}) }` prop with JSDoc.
- [x] 1.2 Add `cnCellWidgets: this.cellWidgets` to `provide()`.

## 2. CnCellRenderer — widget resolution
- [x] 2.1 `inject` adds `cnCellWidgets` (default `() => ({})`).
- [x] 2.2 Props add `widget` (String, default `null`) and `widgetProps` (Object, default `() => ({})`).
- [x] 2.3 Computeds: `hasValue`, `widgetComponent` (registry lookup; built-in `badge` not resolved here), `badgeVariant`.
- [x] 2.4 Template: render `widgetComponent` → built-in `badge` (or `—`) → `hasFormatter` text → existing type-aware branches.

## 3. CnDataTable — unify cell rendering
- [x] 3.1 Remove the `inject: { cnFormatters }` block.
- [x] 3.2 Remove `formatCell()` and `isSchemaColumn()` methods.
- [x] 3.3 Cell template: one `<CnCellRenderer :value :property :formatter :widget :widget-props :row />` for all columns.
- [x] 3.4 Update `getSchemaProperty()` JSDoc (notes the `{}` fallback contract).

## 4. Schema
- [x] 4.1 `$defs.column.widget` — refresh description (it's wired now).
- [x] 4.2 `$defs.column` — add `widgetProps` (`object`, `additionalProperties: true`).

## 5. Docs
- [x] 5.1 `docs/migrating-to-manifest.md` — "Column widgets" subsection.
- [x] 5.2 `src/components/CnAppRoot/CnAppRoot.md` + `docs/components/cn-app-root.md` — `cellWidgets` row.
- [x] 5.3 `src/components/CnCellRenderer/CnCellRenderer.md` — `widget` example; `docs/components/cn-cell-renderer.md` — `widget` / `widgetProps` rows.

## 6. Tests
- [x] 6.1 `tests/components/CnCellRenderer.spec.js` — widget cases (built-in badge, dash-when-empty, consumer widget props, widget+formatter, unknown id) + update existing formatter tests to the new provide shape.

## 7. Build & quality
- [x] 7.1 `npm test` green (jest).
- [x] 7.2 `npm run lint` — no new errors.
- [x] 7.3 `npm run build` succeeds.
- [x] 7.4 `npm run check:docs` green.

## 8. Wrap-up
- [x] 8.1 Update this tasks.md.
- [x] 8.2 PR → `beta`, admin-merge.
