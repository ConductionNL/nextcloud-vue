# scanManifestTokens

Scan a manifest's `pages[].config` and widget `filter` / `dataSource` string
leaves for `@`-prefixed sentinel tokens and bucket them by vocabulary status.
This is the reusable CORE of the hydra token-vocabulary gate — the gate wraps
this helper (adding diff-scope and an exit code) and MUST import it rather than
hardcode the vocabulary.

Only `@`-prefixed strings under `pages[]` are considered; router/registry
invariants elsewhere are out of scope (matching the schema `$def` placement).

## Signature

```js
import { scanManifestTokens } from '@conduction/nextcloud-vue'

const { unknown, deprecated, known } = scanManifestTokens(manifest)
```

| Argument | Type | Description |
|----------|------|-------------|
| `manifest` | `object` | A parsed manifest object. |

## Return value

Returns `{ unknown, deprecated, known }`:

| Field | Type | Description |
|-------|------|-------------|
| `unknown` | `Array<{token, path}>` | Tokens not on the known vocabulary, with the manifest path they were found at. |
| `deprecated` | `Array<{token, path, replacement, removal}>` | Deprecated tokens with their replacement and removal version. |
| `known` | `number` | Count of valid, non-deprecated tokens seen. |

## See also

- [`classifyToken`](./classify-token.md) — the per-token classifier this scan applies.
- [`resolveManifestSubtree`](./resolve-manifest-subtree.md) — resolves the tokens this scan catalogs.
