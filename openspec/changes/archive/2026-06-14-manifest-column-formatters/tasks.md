# Tasks — wire `column.formatter` end-to-end

## 1. CnAppRoot — formatters registry prop

- [x] 1.1 Add `formatters: { type: Object, default: () => ({}) }` prop to `CnAppRoot.vue` with JSDoc.
- [x] 1.2 Add `cnFormatters: this.formatters` to `CnAppRoot`'s `provide()`.

## 2. CnCellRenderer — resolve the formatter

- [x] 2.1 Add `formatter` (String, default `null`) and `row` (Object, default `() => ({})`) props.
- [x] 2.2 Add `inject: { cnFormatters: { default: () => ({}) } }`.
- [x] 2.3 Rework `formattedValue` to call `cnFormatters[formatter](value, row, property)` when resolvable, wrapped in try/catch with a `console.warn` fallback to `formatValue()`.

## 3. CnDataTable — pass through + manual-column path

- [x] 3.1 Add `inject: { cnFormatters: { default: () => ({}) } }`.
- [x] 3.2 Add a `formatCell(row, col)` method (resolve `col.formatter` or return the raw value, try/catch).
- [x] 3.3 Template: pass `:formatter="col.formatter"` + `:row="row"` to `<CnCellRenderer>` (schema columns); render `{{ formatCell(row, col) }}` for manual columns.

## 4. Schema / validator

- [x] 4.1 Confirm `$defs.column.formatter` already exists and `validateManifest` admits a column with a `formatter` id — no schema change needed; add a regression case to the manifest-validation fixtures if one isn't already covered.

## 5. Docs

- [x] 5.1 `docs/migrating-to-manifest.md` — add a `### Column formatters` subsection (ship `src/formatters.js`, pass `:formatters` to `CnAppRoot`, reference ids from `columns[].formatter`).
- [x] 5.2 `src/components/CnAppRoot/CnAppRoot.md` — document the `formatters` prop.
- [x] 5.3 `src/components/CnCellRenderer/CnCellRenderer.md` — document the `formatter`/`row` props + injected `cnFormatters`.

## 6. Tests

- [x] 6.1 `tests/components/CnCellRenderer.spec.js` — named formatter resolves and runs; unknown id falls back; no `cnFormatters` provide falls back; throwing formatter falls back + warns.
- [x] 6.2 (Optional) `tests/components/CnDataTable.spec.js` — a manual column with a `formatter` id renders the formatted value.

## 7. Build & quality

- [x] 7.1 `npm run lint` clean.
- [x] 7.2 `npm test` green (jest).
- [x] 7.3 `npm run build` (the lib's build) succeeds.
- [x] 7.4 `node -e` / `npm run check:manifest`-style validation of any touched fixtures.

## 8. Wrap-up

- [x] 8.1 Update this tasks.md.
- [x] 8.2 Hand off PR creation (to `beta`) to the coordination flow.
