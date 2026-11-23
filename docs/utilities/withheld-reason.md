# withheldReason

Why a value was withheld: the `reason` of OpenRegister's withheld marker (for example `access`), or `''` when the value is not withheld or the marker names no reason.

## Import

```js
import { withheldReason } from '@conduction/nextcloud-vue'
```

## Signature

```ts
function withheldReason(value: unknown): string
```

`CnCellRenderer` turns `access` into "You may not open the linked object, so its value is not shown." and anything else into "This value is not shown." See also [`isWithheld`](./is-withheld.md).
