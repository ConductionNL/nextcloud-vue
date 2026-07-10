# looksLikeSentinel

True when `value` is a string shaped like a sentinel token — i.e. it begins with
`@` — regardless of whether it is a member of the known vocabulary. Use this as
the cheap first filter before the more expensive [`contextOf`](./context-of.md)
/ [`matchDeprecation`](./match-deprecation.md) classification.

## Signature

```js
import { looksLikeSentinel } from '@conduction/nextcloud-vue'

looksLikeSentinel(value)
```

| Argument | Type | Description |
|----------|------|-------------|
| `value` | `*` | Candidate value (any type; only `@`-prefixed strings return `true`). |

## Return value

Returns `boolean`.

## See also

- [`contextOf`](./context-of.md) / [`isKnownToken`](./is-known-token.md) — membership checks for tokens that pass this shape filter.
