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
| `pickPerRow` | `Boolean` | `false` | A row holds one pick, drawn as radio buttons. See [One pick per row](#one-pick-per-row). |
| `scoreLabel` | `Boolean`, `String` | `false` | Show the score. `true` uses the library's words, or give a text with `{score}` and `{max}`. |
| `scoreMax` | `Number` | `null` | The most a user can score. By default the sum of each row's highest points. |
| `scoreMode` | `String` | `'sum'` | `sum` adds the points. `weighted` multiplies each by its row's `weight` first. |
| `weightTemplate` | `String` | `''` | A row's weight in words, with `{weight}`. |
| `rowErrors` | `Object` | `{}` | Errors per row: `{ [rowId]: text }`. |
| `removableRows` | `Boolean` | `false` | A Remove button per row. A row with `removable: false` keeps none. Ignored when `readOnly`. |
| `sortable` | `Boolean` | `false` | A sort button in every head of the grid: the row column sorts by label, a column by the order of `choices` (a value outside them last). Ascending first, then descending. |
| `filterable` | `Boolean` | `false` | A funnel in every head of the grid: the row column filters by the text typed, a column keeps the rows whose cell holds one of the values ticked. |
| `pills` | `Boolean` | `false` | Draw a read-only cell as a pill (`CnStatusBadge`) in its choice's `variant` (`default` when it names none). |

## Events

| Event | Payload | When |
| --- | --- | --- |
| `update:modelValue` | the whole new map | A cell changed. |
| `cell-change` | `{ rowId, columnKey, value, previous }` | A cell changed. |
| `score-change` | `{ score, max, complete }` | With `pickPerRow`, on mount and on every change. `complete` says every open row has a pick. |
| `remove-row` | `{ rowId, row }` | With `removableRows`, the user removed a row. Drop it from `rows`. |

## One pick per row

Board LqInleveringNakijken draws a rubric: criteria with a weight, each level a text with points, one level picked per criterion, and "Score: 8 van 10". LqLlInleveren lets a learner fill the same rubric first.

```vue
<CnChoiceMatrix
  pick-per-row
  :rows="[
    {
      id: 'c1',
      label: 'Standpunt en inleiding',
      weight: 1,
      options: [
        { key: 'none', label: 'Ontbreekt', points: 0 },
        { key: 'clear', label: 'Duidelijk', points: 2 },
      ],
    },
  ]"
  :model-value="picks"
  score-label="Score: {score} van {max}"
  weight-template="(weging {weight})"
  :row-errors="errors"
  @update:model-value="picks = $event"
  @score-change="score = $event">
  <template #scoreNote>Op tijd ingeleverd, geen aftrek</template>
</CnChoiceMatrix>
```

The value is `{ [rowId]: optionKey }`. Give a row `options` when its levels differ, or use `columns` when every row has the same ones. An option is `{ key, label, description?, points? }`.

The component adds up and reports. What a score means, such as a late penalty or a grade, stays with you. `scoreMode` is `sum` unless you ask for `weighted`, because the board adds the points and shows the weight beside them.

`rowErrors` also works in the grid without `pickPerRow`.

## Removable rows

Board PqIntakeFormulier maps fixed questions to fields. When a question is gone from the form, its row carries an error and the user removes it. `removableRows` draws a Remove button on every row, in the grid and with `pickPerRow`.

```vue
<CnChoiceMatrix
	:rows="rows"
	:columns="[{ key: 'field', label: 'Field' }]"
	:choices="fields"
	v-model="mapping"
	:rowErrors="{ q2: 'This question is no longer on the form.' }"
	removableRows
	@remove-row="({ rowId }) => rows = rows.filter(r => r.id !== rowId)" />
```

- Remove emits the map without that row's entry and `remove-row`. The rows are yours, so you drop the row from `rows`.
- A row with `removable: false` keeps no button. To offer Remove only on rows with an error, set `removable: false` on the others.
- Each button is named after its row, "Remove Old question". After a removal a screen reader hears "Removed Old question.", and the focus moves to the Remove button now in that place, or to the grid.

## Sort, filter and pills

Board DqZaaktypeVelden shows who sees and fills in what, per role and status, as a read-only grid: every head sorts and filters, and every cell is a pill. Give the choices a `variant` and switch the three options on.

```vue
<CnChoiceMatrix
	row-header="Field"
	:rows="fields"
	:columns="roles"
	:choices="[
		{ value: 'required', label: 'Required', variant: 'info' },
		{ value: 'edit', label: 'Edit', variant: 'success' },
		{ value: 'readOnly', label: 'Read only' },
		{ value: 'hidden', label: 'Hidden', variant: 'error' },
	]"
	:model-value="rights"
	default-value="edit"
	read-only
	sortable
	filterable
	pills />
```

A column sorts by the order of `choices`, so list them in the order a reader expects. A column's funnel offers only the values that column holds. When the filters leave no row, the grid says "No rows match the filters.". The options apply to the grid, not to `pickPerRow`.

## Accessibility

With `pickPerRow` each row is a radio group of native radio buttons with a legend, so the arrow keys move between levels. A row with an error says so through `aria-invalid` and `aria-describedby`.


- It is a real table: headers carry `scope`, and the title is also the table's caption.
- Every cell's control is named by both axes, "Building costs, Intake", so a screen reader user knows where they are.
- A choice is always a word. The tone only repeats it.
