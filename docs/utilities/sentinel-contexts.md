# SENTINEL_CONTEXTS

A frozen array of the six canonical sentinel-context names. It excludes
`deprecated`, which is a transitional overlay in the schema union rather than a
real resolution context.

## Shape

```js
import { SENTINEL_CONTEXTS } from '@conduction/nextcloud-vue'

// string[] (frozen)
SENTINEL_CONTEXTS // → ['filter', 'config', 'object', 'workspace', 'route', 'declarative']
```

The array is `Object.freeze`d — treat it as read-only.

## See also

- [`contextOf`](./context-of.md) — returns one of these names (or `null`) for a token.
- [`SENTINEL_TOKEN_PATTERNS`](./sentinel-token-patterns.md) — the per-context match patterns.
- [`SENTINEL_VOCABULARY`](./sentinel-vocabulary.md) — the human-readable catalog keyed by these contexts.
