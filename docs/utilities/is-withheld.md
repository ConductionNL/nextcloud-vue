# isWithheld

Whether a value is OpenRegister's withheld marker, `{ "@withheld": true, "reason": "access" }`, which arrives in place of a lens or related field the reader may not see. A surface that renders such a value checks this first: the marker is a truthy object, so it would otherwise print as `[object Object]` or pass for a value.

## Import

```js
import { isWithheld } from '@conduction/nextcloud-vue'
```

## Signature

```ts
function isWithheld(value: unknown): boolean
```

True only for a plain object whose `@withheld` is exactly `true`. `CnCellRenderer` uses it to draw a lock and "Withheld" in any cell. See also [`withheldReason`](./withheld-reason.md).
