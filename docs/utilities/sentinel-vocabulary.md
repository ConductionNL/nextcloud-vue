# SENTINEL_VOCABULARY

A frozen, human-readable catalog of the sentinel-token vocabulary: for each
context, its owning resolver, a description, and its member grammar. This is the
**documentation-facing** source (it feeds schema-generated docs); the
machine-checkable truth lives in the token pattern set the resolver enforces.

## Shape

```js
import { SENTINEL_VOCABULARY } from '@conduction/nextcloud-vue'

// Readonly<Record<string, { resolver: string, description: string, members: string[] }>>
SENTINEL_VOCABULARY.route // → { resolver: 'resolveRouteSentinels', description: …, members: ['@route.<param>'] }
```

Each key is a context (`filter`, `config`, `object`, `workspace`, `route`,
`declarative`); each value describes the resolver that owns it, what the context
is for, and the member token grammar. The object is `Object.freeze`d — treat it
as read-only.

## See also

- [`SENTINEL_RESOLVERS`](./sentinel-resolvers.md) — the compact context → resolver map.
- [`classifyToken`](./classify-token.md) — classifies a token against this vocabulary.
- [`SENTINEL_DEPRECATIONS`](./sentinel-deprecations.md) — the companion deprecation map.
