# SENTINEL_DEPRECATIONS

A frozen, machine-readable deprecation map: single-app token inventions →
canonical replacement (or `null` for outright removal) plus a removal version.
The shared resolver still resolves a deprecated token during its deprecation
window (emitting a one-time warning via
[`warnIfDeprecated`](./warn-if-deprecated.md)); the vocabulary gate **warns**
(does not fail) until the `removal` version.

## Shape

```js
import { SENTINEL_DEPRECATIONS } from '@conduction/nextcloud-vue'

// Readonly<Record<string, { test: RegExp, replacement: (string|null), removal: string, note: string }>>
```

Each entry carries a `test` RegExp so a parameterised deprecated token (for
example `@page.period`) matches its whole family, a `replacement` (or `null`),
the `removal` version, and a human-readable `note`. The object is
`Object.freeze`d — treat it as read-only.

## See also

- [`matchDeprecation`](./match-deprecation.md) — resolves a token against this map.
- [`SENTINEL_VOCABULARY`](./sentinel-vocabulary.md) — the canonical (non-deprecated) vocabulary.
