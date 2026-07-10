# SENTINEL_RESOLVERS

A frozen lookup mapping each sentinel-token **context** to the resolver(s)
responsible for it. It is the documentation-facing source of truth for "which
function resolves an `@`-token of this context", kept in sync with the actual
dispatch through the same classifier ([`classifyToken`](./classify-token.md)).

## Shape

```js
import { SENTINEL_RESOLVERS } from '@conduction/nextcloud-vue'

// Readonly<Record<string, string>>
SENTINEL_RESOLVERS === {
    filter: 'resolveFilterTokens',
    config: 'resolveManifestSentinels / resolveFilterTokens',
    object: 'resolveFilterTokens',
    workspace: 'resolveFilterTokens',
    route: 'resolveRouteSentinels',
    declarative: 'fetchAggregate (OpenRegister server-side)',
}
```

The object is `Object.freeze`d — treat it as read-only.

| Context | Resolver |
|---------|----------|
| `filter` | `resolveFilterTokens` |
| `config` | `resolveManifestSentinels` (load-time) / `resolveFilterTokens` (render) |
| `object` | `resolveFilterTokens` |
| `workspace` | `resolveFilterTokens` |
| `route` | [`resolveRouteSentinels`](./resolve-route-sentinels.md) |
| `declarative` | `fetchAggregate` (OpenRegister server-side) |

## See also

- [`classifyToken`](./classify-token.md) — returns the `context` used as the key here.
- [`resolveManifestSubtree`](./resolve-manifest-subtree.md) — the composed dispatch that routes tokens to these resolvers.
