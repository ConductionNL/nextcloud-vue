# journeyItemTargets

Maps each item of a list answer to what it will be filed as, from the repeating write (see [`findRepeatingWrite`](./find-repeating-write.md)).

```js
import { journeyItemTargets } from '@conduction/nextcloud-vue'

journeyItemTargets([{ product: 'afvalcontainer' }, { product: 'x' }], write)
// [{ value: 'afvalcontainer', typeValue: 'AC', fileable: true }, { value: 'x', typeValue: null, fileable: false }]
```

Returns `[]` without a write. An item whose value has no entry in `targets` is not fileable.

| Parameter | Type | Description |
|-----------|------|-------------|
| `items` | `Array` | The list answer. |
| `write` | `object \| null` | The repeating write from `findRepeatingWrite`. |
