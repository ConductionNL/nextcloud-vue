# duplicateAffordances

What a duplicate warning shows and which buttons it offers, decided in one place so it can be tested without a browser and kept equal to the server's rule. It enforces nothing: the server refuses a duplicate on the write.

## Import

```js
import { duplicateAffordances } from '@conduction/nextcloud-vue'
```

## Signature

```ts
function duplicateAffordances(state: {
    matches?: object[],
    checked?: boolean,
    policy?: string,
    mayOverride?: boolean,
}): { show: boolean, blocked: boolean, mayContinue: boolean, needsReason: boolean }
```

- `show`: the check ran (`checked` is not `false`) and found matches.
- `blocked`: shown, and `policy` is `block`. Any other policy reads as `warn`.
- `mayContinue`: shown, and either not blocked or `mayOverride`.
- `needsReason`: blocked and `mayOverride`: the override must say why.

Used by [CnDuplicateWarning](../components/cn-duplicate-warning.md).
