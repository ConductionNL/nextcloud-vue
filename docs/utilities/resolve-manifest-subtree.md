# resolveManifestSubtree

Resolve every sentinel token in a manifest subtree through a single dispatch,
routing each token by its context to the existing resolver. Behaviour is the
composition of the individual resolvers, so this is a drop-in for a caller that
previously ran [`resolveRouteSentinels`](./resolve-route-sentinels.md) and then
a `resolveFilterTokens`-style pass by hand.

## Signature

```js
import { resolveManifestSubtree } from '@conduction/nextcloud-vue'

const { value, unresolved } = resolveManifestSubtree(value, opts)
```

| Argument | Type | Description |
|----------|------|-------------|
| `value` | `*` | The subtree (typically a `pages[].config` block). Not mutated. |
| `opts` | `object` | Resolution inputs (all optional). |
| `opts.params` | `object` | vue-router params for `@route.<param>` tokens. |
| `opts.ctx` | `object` | Context (`objectId`, `object`, `workspace`, `config`) forwarded to the filter / object / workspace / `@config.<key>` resolvers. |
| `opts.pageId` | `string` | Page id used for route-resolver warning dedup. |
| `opts.warn` | `Function` | A `console.warn` override (tests). |

## Return value

Returns `{ value, unresolved }` — the resolved subtree plus the list of tokens
that stayed unresolved. OPTIONAL `?` tokens are excluded (they are meant to be
dropped, not waited on), as are load-time `config` and server-side
`declarative` contexts this render pass deliberately leaves alone.

Deprecated tokens encountered during the walk warn once via
[`warnIfDeprecated`](./warn-if-deprecated.md).

## See also

- [`resolveRouteSentinels`](./resolve-route-sentinels.md) — the route-context pass composed here.
- [`resolveManifestSentinels`](./resolve-manifest-sentinels.md) — the `@config.<key>` load-time resolver.
- [`classifyToken`](./classify-token.md) / [`scanManifestTokens`](./scan-manifest-tokens.md) — the vocabulary gate helpers.
