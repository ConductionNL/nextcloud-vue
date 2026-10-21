# CnConditionTreeEditor

AND/OR groups of conditions (field, operator, value) to any depth, for a rule that decides which records belong: a segment's members, a saved view's rows, an audience. Every control is a select, a field or a button, so the whole tree is built with the keyboard.

With `previewEndpoint` the editor posts the finished tree to the app after a pause in editing and shows how many records match. A validation message whose text starts with a node path (`$.children[1]: ...`) is shown at that node.

## Usage

```vue
<CnConditionTreeEditor
  v-model="rules"
  :field-options="fields"
  :preview-endpoint="{ url: '/apps/myapp/api/segments/preview', body: { entityType: 'contact' }, countPath: 'estimatedSize' }"
  count-label="Estimated members:"
  @validity-change="canSave = $event" />
```

```js
const fields = [
  { value: 'city', label: 'City', type: 'string' },
  { value: 'age', label: 'Age', type: 'integer' },
  { value: 'newsletter', label: 'Newsletter', type: 'boolean' },
  { value: 'createdAt', label: 'Created', type: 'string', format: 'date' },
]
```

## The tree

```json
{ "type": "AND", "children": [
  { "field": "city", "operator": "equals", "value": "Delft" },
  { "type": "OR", "children": [
    { "field": "age", "operator": "greaterThan", "value": 65 },
    { "field": "newsletter", "operator": "equals", "value": true }
  ] }
] }
```

- A group is `{ type: 'AND' | 'OR', children }`; a condition `{ field, operator, value }`.
- Choosing a field resets its condition to the first operator of the field's type, with an empty value (true for a yes/no field).
- A stored field or operator the editor does not offer is still shown, so a saved rule always shows what it tests.

## Operators

The default operators per field type travel to the endpoint as written:

| Type | Operators |
|------|-----------|
| `string` | `equals`, `notEquals`, `contains` |
| `integer`, `number` | `equals`, `notEquals`, `greaterThan`, `greaterThanOrEqual`, `lessThan`, `lessThanOrEqual` |
| `boolean` | `equals` (Is), `notEquals` (Is not) |
| `array` | `contains` |
| `format: 'date'` | the type's operators plus `before`, `after` |

`operators` replaces the defaults for the types it names: `{ string: [{ value: 'startsWith', label: 'Starts with' }] }`.

## Preview

`previewEndpoint` is `{ url, method?, body?, rulesKey?, countPath?, validPath?, errorPath? }`. The tree goes out as `body[rulesKey]` (default `rules`) with POST (or PUT). An answer whose `validPath` (default `valid`) is false shows the message at `errorPath` (default `error`); otherwise the count at `countPath` (default `count`) is shown after `countLabel`. Only the newest request may set the result.

Without `previewEndpoint` a finished tree is valid as it stands.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `Object` | `{ type: 'AND', children: [] }` | The tree. |
| `fieldOptions` | `Array` | `[]` | The fields a condition can test: `[{ value, label, type, format? }]`. Labels go through the app's translate. |
| `operators` | `Object` | `null` | Operators per field type, replacing the defaults for the types it names. |
| `previewEndpoint` | `Object` | `null` | Where a finished tree is checked and counted (see Preview). |
| `errors` | `Object` | `{}` | The app's own error messages by node path (`$`, `$.children[1]`). |
| `countLabel` | `String` | `''` | The words before the count (default "Matches:"). |
| `countNote` | `String` | `''` | A line after the count. |
| `emptyText` | `String` | `''` | Shown in an empty tree. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | `Object` | The new tree. |
| `status-change` | `String` | `empty`, `incomplete`, `checking`, `valid`, `invalid` or `failed`. |
| `validity-change` | `Boolean` | Whether the tree is finished and, with a preview endpoint, accepted. |
