# matchDeprecation

The deprecation entry matching a sentinel `token`, or `null`. A deprecated token
is still accepted by the schema (its pattern is in the union) but both the
vocabulary gate and the resolver flag it — the resolver via a one-time warning
(see [`warnIfDeprecated`](./warn-if-deprecated.md)).

## Signature

```js
import { matchDeprecation } from '@conduction/nextcloud-vue'

const entry = matchDeprecation(token)
```

| Argument | Type | Description |
|----------|------|-------------|
| `token` | `string` | The `@`-prefixed token. |

## Return value

Returns `{ key, replacement, removal, note }` for a deprecated token, or `null`:

| Field | Type | Description |
|-------|------|-------------|
| `key` | `string` | The deprecation-map key the token matched. |
| `replacement` | `string \| null` | The canonical replacement token, or `null` when the token is being removed with no replacement. |
| `removal` | `string` | The removal version / date. |
| `note` | `string` | Human-readable migration note. |

## See also

- [`SENTINEL_DEPRECATIONS`](./sentinel-deprecations.md) — the underlying deprecation map.
- [`warnIfDeprecated`](./warn-if-deprecated.md) — emits the one-time warning using this match.
