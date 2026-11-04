---
sidebar_position: 34
---

# CnDataMatrix

Inline-edit data grid for matrix-shaped data (rows × columns). Each cell is click-to-edit; commits emit `@cell-edit({rowId, colKey, value, row})` so the parent persists. Optional row / column / grand totals computed from the live data, with per-column `aggregate` (`sum` default, `avg`, `count`, `none`).

Not a full spreadsheet engine — no range references, no charts. For richer needs embed `handsontable` (or similar) and use this for the simpler cases (gradebooks, weight matrices, scoring rubrics, allocation tables).

## Try it

```vue
<CnDataMatrix
  title="Cohort gradebook"
  row-header="Student"
  :rows="students"
  :columns="[
    { key: 'midterm', label: 'Midterm', type: 'number', aggregate: 'sum' },
    { key: 'final',   label: 'Final',   type: 'number', aggregate: 'sum' },
    { key: 'note',    label: 'Note',    type: 'string', readOnly: true },
  ]"
  :show-row-totals="true"
  :show-column-totals="true"
  @cell-edit="onCellEdit" />
```

```js
function onCellEdit({ rowId, colKey, value }) {
  // value is coerced to a number for type='number' columns (null when unparseable)
}
```

## Column declaration

```js
{
  key: 'midterm',         // row-record field key
  label: 'Midterm',       // header label
  type: 'number',         // 'number' | 'string'
  readOnly: false,        // per-column read-only override
  formatter: (v) => …,    // optional custom display formatter
  aggregate: 'sum',       // 'sum' (default) | 'avg' | 'count' | 'none'
  width: '120px',         // optional column width override
  weight: 40,             // optional weight for rowTotalsMode 'weighted'
  weightLabel: '40%',     // optional text beside the label; the weight itself without it
  formula: 'a/b*100',     // optional: computes the cell, read only; see Computed columns
  round: 'ceil',          // optional for formula: 'round' | 'ceil' | 'floor'
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `rows` | `Array<object>` | `[]` | Row records. |
| `columns` | `Array<ColumnDef>` | `[]` | Column declarations (see above). |
| `rowIdKey` | String | `'id'` | Row record's id field. |
| `rowLabelKey` | String | `'label'` | Row record's label field. |
| `rowHeader` | String | `''` | Header for the row-label column. Empty hides it. |
| `title` / `description` | String | `''` | Optional header. |
| `emptyLabel` | String | `'No data.'` | Empty-state text. |
| `readOnly` | Boolean | `false` | Disable editing globally. |
| `showRowTotals` | Boolean | `false` | Render the per-row totals column on the right. |
| `showColumnTotals` | Boolean | `false` | Render the per-column totals row at the bottom. |
| `rowTotalsLabel` / `columnTotalsLabel` | String | `'Total'` | Total-row / column labels. |
| `rowTotalsMode` | String | `'sum'` | `sum` adds the number columns; `weighted` takes their mean weighted by each column's `weight`. |
| `totalsFractionDigits` | Number | `null` | Rounds the totals; null keeps the locale default. |
| `showRank` | Boolean | `false` | Adds a rank column: highest total first, equal totals share a rank. |
| `rankLabel` | String | `''` | Header of the rank column; the library default is "Rank". |
| `highlightTopRank` | Boolean | `false` | Tints the row ranked first. |
| `rowSublabelKey` | String | `''` | Field drawn as a second line under each row label. |

## Computed columns

Board LqPrognose draws "Verwachte leerlingen per leerjaar": per row typed percentages and a computed number. Give a column `formula`, and its cells compute and stay read only.

```js
const columns = [
  { key: 'now', label: 'Nu', type: 'number' },
  { key: 'over', label: 'Over, procent', type: 'number' },
  { key: 'stays', label: 'Blijft zitten, procent', type: 'number' },
  { key: 'expected', label: 'Verwacht', type: 'number', round: 'round', formula: 'prev_now*prev_over/100+now*stays/100' },
]
```

A formula reads the row's numbers by column key, and the row above as `prev_<key>`. It also sees formula columns to its left. It takes `+ - * /`, parentheses and decimals, through `evalFormula`, so a column key must be a plain name such as `now` or `per_group`. `round` is `round`, `ceil` or `floor`.

When a formula has no answer, the cell shows what the row itself holds. The first row has no row above, so the intake of a first year can sit in `expected` on that row. An empty cell and a division by zero also give no answer. Totals, weights and ranks use the computed value. When a user edits a number, you get `cell-edit` as usual, and the computed cells follow from your new `rows`.

## A scoring matrix

Board DqAanbesteding scores bidders against weighted award criteria. Give each column a `weight`, set `rowTotalsMode` to `weighted`, and the total is the weighted mean of the scores. A cell without a score is left out of that mean. The rank column orders the bidders by their total.

```vue
<CnDataMatrix
  title="Beoordelingsmatrix"
  description="Gemiddelde van 2 van 3 beoordelaars, scores 0 tot 10 per criterium"
  row-header="Inschrijver"
  row-sublabel-key="price"
  :rows="bids"
  :columns="[
    { key: 'price', label: 'Prijs', type: 'number', weight: 40, weightLabel: '40%' },
    { key: 'plan', label: 'Plan van aanpak', type: 'number', weight: 30, weightLabel: '30%' },
    { key: 'sustainability', label: 'Duurzaamheid', type: 'number', weight: 20, weightLabel: '20%' },
    { key: 'social', label: 'Social return', type: 'number', weight: 10, weightLabel: '10%' },
  ]"
  read-only
  show-row-totals
  row-totals-mode="weighted"
  :totals-fraction-digits="1"
  show-rank
  highlight-top-rank
  :rank-label="t('myapp', 'Rang')"
  :row-totals-label="t('myapp', 'Totaal')" />
```

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `cell-edit` | `{rowId, colKey, value, row}` | Commit (blur or Enter). For `type:'number'` columns the `value` is coerced; unparseable input becomes `null`. |

## Keyboard

| Key | Action |
|-----|--------|
| Enter | Commit the active edit. |
| Esc   | Cancel the active edit (no `@cell-edit`). |
| Blur  | Commit (same as Enter). |

## See also

- [`CnDataTable`](./cn-data-table.md) — row-shaped tables with sort/select/expand.
