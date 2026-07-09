# warnIfDeprecated

Emit a one-time deprecation warning for a manifest sentinel `token` if it
appears on the deprecation map, then report whether the token is deprecated.
Used inside [`resolveManifestSubtree`](./resolve-manifest-subtree.md) so a
deprecated token referenced from many pages warns exactly once for the process
lifetime.

## Why a one-time warner

A deprecated `@`-token (for example a renamed sentinel) can appear on dozens of
pages in a single manifest. Warning on every occurrence would flood the console
and bury the message. `warnIfDeprecated` deduplicates per token against a
process-wide set, so the first reference warns and the rest stay quiet. The set
is cleared only by [`clearDeprecationWarnings`](./clear-deprecation-warnings.md)
(test-only).

## Signature

```js
import { warnIfDeprecated } from '@conduction/nextcloud-vue'

warnIfDeprecated(token, warn)
```

| Argument | Type | Description |
|----------|------|-------------|
| `token` | `string` | The `@`-prefixed sentinel token to check. |
| `warn` | `Function` | A `console.warn` override — tests pass a spy; production callers pass their own logger. |

## Return value

Returns `true` when `token` is deprecated (regardless of whether a warning was
emitted this call — a repeat reference still returns `true` but stays silent),
`false` otherwise.

## Usage

```js
import { warnIfDeprecated } from '@conduction/nextcloud-vue'

const isDeprecated = warnIfDeprecated('@config.legacyKey', console.warn)
// isDeprecated === true, and a one-time console.warn is emitted describing
// the replacement token and removal version.
```

## See also

- [`clearDeprecationWarnings`](./clear-deprecation-warnings.md) — resets the one-time dedup set (test-only).
- [`resolveManifestSubtree`](./resolve-manifest-subtree.md) — the resolver that calls this on every leaf token.
