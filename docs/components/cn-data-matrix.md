---
sidebar_position: 34
---

# CnDataMatrix

Inline-edit data grid for matrix-shaped data (rows × columns). Each cell is click-to-edit; commits emit `@cell-edit({rowId, colKey, value, row})` so the parent persists. Optional row / column / grand totals computed from the live data, with per-column `aggregate` (`sum` default, `avg`, `count`, `none`).

Not a full spreadsheet engine — no formulas, no range references, no charts. For richer needs embed `handsontable` (or similar) and use this for the simpler cases (gradebooks, weight matrices, scoring rubrics, allocation tables).

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
