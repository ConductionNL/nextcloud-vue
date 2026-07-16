# contextOf

The canonical context a sentinel `token` belongs to, or `null` if it is not a
member of any canonical context. Deprecated tokens return `null` here (they are
not a canonical context) — use [`matchDeprecation`](./match-deprecation.md) to
detect those.

## Signature

```js
import { contextOf } from '@conduction/nextcloud-vue'

contextOf(token)
```

| Argument | Type | Description |
|----------|------|-------------|
| `token` | `string` | The `@`-prefixed token. |

## Return value

Returns a member of the canonical contexts (`filter`, `config`, `object`,
`workspace`, `route`, `declarative`) or `null`.

## See also

- [`isKnownToken`](./is-known-token.md) — boolean membership check.
- [`SENTINEL_RESOLVERS`](./sentinel-resolvers.md) — maps each context to its resolver.
- [`matchDeprecation`](./match-deprecation.md) — detect deprecated (non-canonical) tokens.
