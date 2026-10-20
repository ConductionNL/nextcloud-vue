# candidateWithoutBlanks

The candidate to send to OpenRegister's duplicate check, with every blank field left out. OpenRegister scores two empty strings as a match, and a form sends `''` for every field nobody filled in, so sending blanks would match almost every pair of records.

## Import

```js
import { candidateWithoutBlanks } from '@conduction/nextcloud-vue'
```

## Signature

```ts
function candidateWithoutBlanks(payload: object): object
```

Drops `null`, `undefined`, `''` and empty arrays; keeps everything else, including `0` and `false`.

See [CnDuplicateWarning](../components/cn-duplicate-warning.md).
