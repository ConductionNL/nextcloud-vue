# classifyToken

Classify a manifest sentinel `token` for gate / dispatcher consumption:
whether it is a known context, a deprecated token, or unknown vocabulary.

## Signature

```js
import { classifyToken } from '@conduction/nextcloud-vue'

const { status, context, deprecation } = classifyToken(token)
```

| Argument | Type | Description |
|----------|------|-------------|
| `token` | `string` | The `@`-prefixed token to classify. |

## Return value

Returns `{ status, context, deprecation }`:

| Field | Type | Description |
|-------|------|-------------|
| `status` | `'known' \| 'deprecated' \| 'unknown'` | Vocabulary status of the token. |
| `context` | `string \| null` | The resolution context (`filter`, `config`, `object`, `workspace`, `route`, `declarative`) for a known token, else `null`. |
| `deprecation` | `object \| null` | The deprecation record (replacement / removal / note) for a deprecated token, else `null`. |

## See also

- [`scanManifestTokens`](./scan-manifest-tokens.md) — buckets a whole manifest's tokens using this classifier.
- [`SENTINEL_RESOLVERS`](./sentinel-resolvers.md) — maps each context to the resolver that handles it.
