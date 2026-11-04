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

## Events

| Event | Payload | When |
| --- | --- | --- |
| `update:modelValue` | the whole new map | A cell changed. |
| `cell-change` | `{ rowId, columnKey, value, previous }` | A cell changed. |
| `score-change` | `{ score, max, complete }` | With `pickPerRow`, on mount and on every change. `complete` says every open row has a pick. |

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

## Accessibility

With `pickPerRow` each row is a radio group of native radio buttons with a legend, so the arrow keys move between levels. A row with an error says so through `aria-invalid` and `aria-describedby`.


- It is a real table: headers carry `scope`, and the title is also the table's caption.
- Every cell's control is named by both axes, "Building costs, Intake", so a screen reader user knows where they are.
- A choice is always a word. The tone only repeats it.
