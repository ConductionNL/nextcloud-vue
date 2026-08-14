# validateBsn

Validates a Dutch **BSN** (Burgerservicenummer) against the *elfproef* — in the
browser, without a round trip.

```js
import { validateBsn } from '@conduction/nextcloud-vue'

const result = validateBsn('111222333')
// { isFormeelGeldig: true, elfproefScore: 0, errorCode: null, maskedBsn: '***2223*' }
```

| Param | Type | Description |
|-------|------|-------------|
| `input` | `string` | The candidate BSN. `null`/`undefined` are tolerated and reported invalid. |

Returns `{ isFormeelGeldig, elfproefScore, errorCode, maskedBsn }`.

| Field | Type | Description |
|-------|------|-------------|
| `isFormeelGeldig` | `boolean` | Nine digits satisfying the elfproef. |
| `elfproefScore` | `number` | The modulo — `0` when valid, `-1` when the input was not nine digits. |
| `errorCode` | `string\|null` | [`BSN_ERROR_LENGTH`](./bsn-error-length.md), [`BSN_ERROR_CHECKSUM`](./bsn-error-checksum.md), or `null`. |
| `maskedBsn` | `string` | See [`maskBsn`](./mask-bsn.md). The raw input is never echoed back. |

## This does not replace server-side validation

It is a UX affordance. OpenRegister's `bsn` schema property validator remains
the write boundary, and anything reaching the API directly never touches a
browser. What this replaces is a *validation endpoint* whose only job is to
return a yes/no about a checksum — a network hop per keystroke that also puts
special-category personal data on the wire.

A formally valid BSN is not an **issued** one. The elfproef proves the number is
well-formed; only a BRP lookup establishes that it belongs to a person.

## The ninth digit weighs −1

`sum(digit[i] × (9 − i))` for `i = 0..7`, then **subtract** `digit[8]`; valid when
divisible by eleven. An implementation that *adds* the last digit accepts roughly
one in eleven invalid numbers, which is why the test suite pins cases that
separate the two weightings.
