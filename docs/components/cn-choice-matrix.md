# CnChoiceMatrix

Rows against columns, where every cell holds one choice out of the same closed set. Board DqZaaktypeVelden draws it as "Wie wat ziet en invult, per rol en status": fields against role and status, each cell hidden, required or read only.

## When to use it

Use it when each cell is a pick from a fixed list. For free values, such as scores or amounts, use [`CnDataMatrix`](./cn-data-matrix.md). For who may do what with ticks, use `CnActionAuthMatrix`.

## Usage

```vue
<CnChoiceMatrix
  title="Who sees and fills in what"
  row-header="Field"
  :rows="[{ id: 'costs', label: 'Building costs' }, { id: 'area', label: 'Area' }]"
  :columns="[
    { key: 'intake', label: 'Intake', description: 'received' },
    { key: 'officer', label: 'Officer', description: 'in progress, decision' },
  ]"
  :choices="[
    { value: 'hidden', label: 'Hidden', tone: 'muted' },
    { value: 'required', label: 'Required', tone: 'strong' },
    { value: 'readonly', label: 'Read only' },
  ]"
  :model-value="rights"
  default-value="readonly"
  @update:model-value="rights = $event"
  @cell-change="saveCell" />
```

The value is a map, `{ [rowId]: { [columnKey]: value } }`. A cell with nothing stored shows `defaultValue`. The component keeps no copy of the map, so a save that is refused changes nothing on screen as long as the host does not pass the new map back in.

A row or column with `readOnly: true`, or the `readOnly` prop on the matrix, draws its cells as text. A stored value outside `choices` then reads as it is stored, so it is seen and not mistaken for empty.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `rows` | `Array` | `[]` | Rows, with an id, a label and an optional `readOnly`. |
| `columns` | `Array` | `[]` | `{ key, label, description?, readOnly? }`. |
| `choices` | `Array` | `[]` | `{ value, label, tone? }`; `tone` is `muted` or `strong`. |
| `modelValue` | `Object` | `{}` | The stored choices. |
| `defaultValue` | `String` | `''` | What a cell with nothing stored shows. |
| `rowIdKey` | `String` | `'id'` | Key of a row's id. |
| `rowLabelKey` | `String` | `'label'` | Key of a row's label. |
| `rowHeader` | `String` | `''` | Heading of the row column. |
| `title` | `String` | `''` | Title above the grid. |
| `description` | `String` | `''` | Line under the title. |
| `emptyLabel` | `String` | `''` | Text with no rows or columns; the default is "Nothing to set yet.". |
| `readOnly` | `Boolean` | `false` | Draw every cell as text. |

## Events

| Event | Payload | When |
| --- | --- | --- |
| `update:modelValue` | the whole new map | A cell changed. |
| `cell-change` | `{ rowId, columnKey, value, previous }` | A cell changed. |

## Accessibility

- It is a real table: headers carry `scope`, and the title is also the table's caption.
- Every cell's control is named by both axes, "Building costs, Intake", so a screen reader user knows where they are.
- A choice is always a word. The tone only repeats it.
