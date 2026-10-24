# conditionSentence

A condition `{ field, operator, value? }` written as the clause of a rule, after "Als" / "If", with the field's label, the operator's label and the formatted value.

```js
import { conditionSentence } from '@conduction/nextcloud-vue'

conditionSentence(
	{ field: 'costs', operator: 'gt', value: 100000 },
	[{ id: 'costs', label: 'Bouwkosten', type: 'number', format: 'currency' }],
) // in Dutch: "Bouwkosten groter is dan € 100.000"
```

It reads the operator through [`operatorLabel`](./operator-label.md) and the value through [`formatConditionValue`](./format-condition-value.md).
