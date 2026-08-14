# maskBsn

Masks a BSN for display, logging, or audit storage.

```js
import { maskBsn } from '@conduction/nextcloud-vue'

maskBsn('123456789') // '***4567*'
maskBsn('1234')      // '****'
maskBsn('')          // ''
```

| Param | Type | Description |
|-------|------|-------------|
| `input` | `string` | The raw BSN, or any string to mask. `null`/`undefined` yield `''`. |

Returns the masked string. Shape is `***XXXX*` — characters at index 3–6
revealed, the rest starred. An input shorter than five characters is starred out
completely rather than part-revealed, because a partial mask of a short input
leaks proportionally more of it.

## Keep this byte-identical across layers

The masked value is what gets written to **audit records**. pipelinq's
`BsnValidationService::mask()` produces exactly this shape, and the two must not
drift: if a form displayed one masking and the audit trail stored another, the
two could not be reconciled after the fact.

The raw BSN is special-category personal data under the AVG. Only the masked
form is safe to render, log, or persist.

Used by [`validateBsn`](./validate-bsn.md), which never echoes the raw input.
