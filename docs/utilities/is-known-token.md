# isKnownToken

True when `token` is a member of the closed CANONICAL sentinel vocabulary (in
any context). Deprecated tokens are NOT canonical and return `false` — detect
those with [`matchDeprecation`](./match-deprecation.md).

## Signature

```js
import { isKnownToken } from '@conduction/nextcloud-vue'

isKnownToken(token)
```

| Argument | Type | Description |
|----------|------|-------------|
| `token` | `string` | The `@`-prefixed token. |

## Return value

Returns `boolean`.

## See also

- [`contextOf`](./context-of.md) — returns the specific context instead of a boolean.
- [`classifyToken`](./classify-token.md) — combined known / deprecated / unknown classification.
