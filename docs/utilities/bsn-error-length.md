# BSN_ERROR_LENGTH

The `errorCode` [`validateBsn`](./validate-bsn.md) returns when the input was not
exactly nine digits.

```js
import { BSN_ERROR_LENGTH, validateBsn } from '@conduction/nextcloud-vue'

validateBsn('12345678').errorCode  // BSN_ERROR_LENGTH  — too short
validateBsn('12345678a').errorCode // BSN_ERROR_LENGTH  — not all digits
```

Value: `'length'`.

Distinguished from [`BSN_ERROR_CHECKSUM`](./bsn-error-checksum.md) so a form can
say *"a BSN is nine digits"* while the user is still typing, and only complain
about the checksum once the length is right. Reporting a checksum failure on a
half-typed number is noise.

When this code is returned, `elfproefScore` is `-1` — the elfproef was never
computed.
