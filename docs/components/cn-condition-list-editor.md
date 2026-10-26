# CnConditionListEditor

The conditions of a rule as rows over an object's own fields: a field, an operator and a value. All rows hold together. The operators follow the field's type, "is filled in" needs no value, and a choice or yes/no field gets a choice as its value.

```vue
<CnConditionListEditor
	v-model="rule.conditions"
	:label="t('myapp', 'If')"
	:fields="[
		{ id: 'bouwkosten', label: 'Bouwkosten', type: 'number', format: 'currency' },
		{ id: 'welstandsgebied', label: 'Welstandsgebied', type: 'boolean' },
		{ id: 'bouwtekening', label: 'Bouwtekening', type: 'presence' },
	]" />
```

The value is `[{ field: 'bouwkosten', operator: 'gt', value: 100000 }]`.

## Operators per field type

| Type | Operators |
|------|-----------|
| `number`, `integer`, `date` | `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `present` |
| `boolean` | `eq` (value `true` or `false`) |
| `presence` | `present` |
| anything else | `eq`, `neq`, `present` |

## Reading a condition back

`conditionSentence(condition, fields)` returns the condition as the clause of a rule, translated, with the value formatted by its field: in Dutch `Bouwkosten groter is dan € 100.000` and `Welstandsgebied ja is`. `operatorsForType`, `operatorLabel`, `operatorTakesValue` and `formatConditionValue` are exported too.

## Props

| Prop | Type | Default | Meaning |
|------|------|---------|---------|
| `modelValue` / `value` | Array | `[]` | The conditions, `{ field, operator, value? }[]`. |
| `fields` | Array | `[]` | `{ id, label, type?, options?, format?, currency? }`. `options` (`[{ id, label }]`) make the value a choice; `format: 'currency'` formats a number in euros. |
| `label` | String | `''` | The legend above the rows, already translated. |
| `emptyText` | String | `''` | What an empty list says; the library default is "No conditions: the rule always applies." |

## Events

| Event | When |
|-------|------|
| `update:modelValue`, `input` | Any change, with the whole list. |
