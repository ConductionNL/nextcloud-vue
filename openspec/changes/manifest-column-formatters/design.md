# Design — wire `column.formatter` end-to-end

## Plumbing (mirrors `cnCustomComponents` / `cnPageTypes`)

```
consumer app
  └─ <CnAppRoot :formatters="appFormatters">      ← NEW prop, provide('cnFormatters')
       └─ <router-view>
            └─ <CnPageRenderer>                    ← untouched
                 └─ <CnIndexPage>                  ← untouched (columns ride through)
                      └─ <CnDataTable>             ← inject('cnFormatters'); formatCell() for manual cols
                           └─ <CnCellRenderer      ← inject('cnFormatters'); NEW :formatter, :row props
                                :formatter="col.formatter" :row="row" ... />
```

`provide`/`inject` crosses `<router-view>` and `<CnPageRenderer>` without
either having to re-provide, so the chain works with the standard fleet
bootstrap (`main.js` builds the router with `CnPageRenderer` route
components, `App.vue` mounts `<CnAppRoot>`). `CnPageRenderer`-used-standalone
(no `CnAppRoot`) is the documented out-of-scope edge case.

## `CnAppRoot.vue`

- Add prop `formatters: { type: Object, default: () => ({}) }` (JSDoc:
  "Cell-formatter registry. Map of formatter-id → `(value, row, property) => string|number`.
  Resolves `pages[].config.columns[].formatter` ids for `CnDataTable` /
  `CnCellRenderer`. Empty by default.").
- In `provide()` add `cnFormatters: this.formatters`.

## `CnCellRenderer.vue`

- Add props: `formatter: { type: String, default: null }`, `row: { type: Object, default: () => ({}) }`.
- Add `inject: { cnFormatters: { default: () => ({}) } }`.
- `formattedValue` computed:
  ```js
  formattedValue() {
    const fn = this.formatter && this.cnFormatters && this.cnFormatters[this.formatter]
    if (typeof fn === 'function') {
      try {
        return fn(this.value, this.row, this.property)
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn(`[CnCellRenderer] formatter "${this.formatter}" threw`, e)
      }
    }
    return formatValue(this.value, this.property, { truncate: this.truncate })
  }
  ```
  (When a formatter is in play, the cell still flows through the `<template v-else>`
  default branch, so booleans/enums/arrays with a `formatter` get the formatter
  output rendered as plain text — formatters are an explicit override of the
  type-aware path, by design.)

## `CnDataTable.vue`

- Add `inject: { cnFormatters: { default: () => ({}) } }`.
- New method:
  ```js
  formatCell(row, col) {
    const value = this.getCellValue(row, col.key)
    const fn = col.formatter && this.cnFormatters && this.cnFormatters[col.formatter]
    if (typeof fn === 'function') {
      try { return fn(value, row, col) } catch (e) {
        // eslint-disable-next-line no-console
        console.warn(`[CnDataTable] formatter "${col.formatter}" threw`, e)
      }
    }
    return value
  }
  ```
- Template: `<CnCellRenderer :value="getCellValue(row, col.key)" :property="getSchemaProperty(col.key)" :formatter="col.formatter" :row="row" />` for schema columns; for manual columns the cell becomes `{{ formatCell(row, col) }}`. The `#column-{key}` scoped-slot override path is unchanged (slots still win).

## Tests — `tests/components/CnCellRenderer.spec.js`

1. Mount `CnCellRenderer` with `propsData: { value: 'lead.created', property: { type: 'string' }, formatter: 'humanTrigger', row: { trigger: 'lead.created' } }` and `provide: { cnFormatters: { humanTrigger: (v) => 'Lead created' } }` ⇒ text is `Lead created`.
2. Unknown formatter id ⇒ falls back to `formatValue` (the raw/truncated value).
3. No `cnFormatters` provide ⇒ falls back (default `{}`).
4. Formatter throws ⇒ falls back + `console.warn` called.

## Docs

- `docs/migrating-to-manifest.md` — a `### Column formatters` subsection under the index-page section: how to ship `src/formatters.js`, pass `:formatters` to `CnAppRoot`, reference ids from `columns[].formatter`.
- `src/components/CnAppRoot/CnAppRoot.md` — document the `formatters` prop.
- `src/components/CnCellRenderer/CnCellRenderer.md` — note the `formatter`/`row` props + injected registry.

## Seed Data

N/A — no OpenRegister schemas/registers introduced or modified.
