# operatorsForType

The operators a condition may use for a field type, as [`CnConditionListEditor`](../components/cn-condition-list-editor.md) offers them.

```js
import { operatorsForType } from '@conduction/nextcloud-vue'

operatorsForType('number') // ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'present']
```

Numbers and dates compare; yes/no is only "is"; a `presence` field (a document, a relation) can only be filled in; text and choices say is, is not or is filled in.

See also [`operatorLabel`](./operator-label.md) and [`operatorTakesValue`](./operator-takes-value.md).
