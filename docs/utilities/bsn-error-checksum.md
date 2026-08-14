# BSN_ERROR_CHECKSUM

The `errorCode` [`validateBsn`](./validate-bsn.md) returns when the input is nine
digits but fails the *elfproef*.

```js
import { BSN_ERROR_CHECKSUM, validateBsn } from '@conduction/nextcloud-vue'

validateBsn('111222334').errorCode // BSN_ERROR_CHECKSUM
```

Value: `'checksum'`.

Nine digits were supplied, so the shape is right and the number is simply not a
well-formed BSN — most often a typo. That is a different message to the user than
[`BSN_ERROR_LENGTH`](./bsn-error-length.md), which means they have not finished
typing.

When this code is returned, `elfproefScore` carries the non-zero modulo, which is
useful when debugging a validator but should not be surfaced to a user.

**Formal validity is not issuance.** A number that clears the elfproef is
well-formed, nothing more — only a BRP lookup establishes that it belongs to a
real person.
