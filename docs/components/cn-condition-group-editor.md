# CnConditionGroupEditor

The conditions of a rule in groups. Each group chooses whether all or any of its conditions must hold, and the root can hold inner groups, so a rule reads "this, and one of these". The rows are the same field, operator and value rows as [`CnConditionListEditor`](./cn-condition-list-editor.md).

```vue
<CnConditionGroupEditor
	v-model="segment.rules"
	:fields="[
		{ value: 'place', label: 'Plaats', type: 'string' },
		{ value: 'industry', label: 'Branche', type: 'string' },
		{ value: 'lastContact', label: 'Laatste contact', type: 'string', format: 'date' },
	]"
	:operators="{
		string: [{ value: 'equals', label: 'Is gelijk aan' }, { value: 'contains', label: 'Bevat' }],
		default: [{ value: 'equals', label: 'Is gelijk aan' }],
	}"
	:emptyText="t('myapp', 'No conditions yet.')" />
```

The value is a group tree:

```json
{
  "type": "AND",
  "children": [
    { "field": "place", "operator": "equals", "value": "Zuiddrecht" },
    {
      "type": "OR",
      "children": [
        { "field": "industry", "operator": "equals", "value": "horeca" },
        { "field": "industry", "operator": "equals", "value": "detailhandel" }
      ]
    }
  ]
}
```

## What it draws

- Every group opens with a radio pair under "How the conditions combine": "Match all conditions" (`AND`) and "Match any condition" (`OR`).
- Each row starts with its connector: "Where" on the first row, then "and" or "or".
- A row that holds an inner group shows its connector and a caption, "all of these" or "one of these", with the group as an indented card below it.
- An inner group carries a written "Remove group" button. Every condition has a remove button.
- Add group shows only on groups above `maxDepth`. With the default of 1, the root holds conditions and groups, and an inner group holds conditions. A deeper tree that arrives from elsewhere still renders every level.
- A group of any other type, such as `NOT`, shows as a locked row, "These conditions are kept as written", that can only be removed.
- A value that is not a group reads as one `AND` group: a bare condition, a list of nodes, or `children` without a `type`. The editor emits the group form on the first change.

## Operators

`operators` keeps the host's own operator names. Pass a map from field type to `[{ value, label }]`, with `default` for any type not listed, or a function `(field) => [{ value, label }]` when the choice depends on more than the type (a date format, say). Without it the editor offers the operators of `CnConditionListEditor` (`operatorsForType`). Picking a field resets the operator to its first choice and clears the value.

## Errors

`errors` maps a node path in validator notation to a translated message. `$.children[1].children[0]` is the first condition of the second child of the root. The message shows under that row, or under that group when the path names a group.

## Props

| Prop | Type | Default | Meaning |
|------|------|---------|---------|
| `modelValue` / `value` | Object | `{ type: 'AND', children: [] }` | The group tree. |
| `fields` | Array | `[]` | `{ id` or `value, label, type?, format?, options? }`. `type` number or integer types a number; `type` or `format` date picks a date; `type` boolean or `options` (`[{ id, label }]`) make the value a choice. |
| `operators` | Object or Function | `null` | The operators per field type, or per field; see above. |
| `maxDepth` | Number | `1` | The deepest level Add group may build. |
| `errors` | Object | `{}` | Messages keyed by node path. |
| `emptyText` | String | `''` | What an empty root says; the library default is "This group has no conditions yet." |

## Events

| Event | When |
|-------|------|
| `update:modelValue`, `input` | Any change, with the whole tree. |
