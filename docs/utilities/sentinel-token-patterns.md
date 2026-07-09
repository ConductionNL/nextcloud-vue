# SENTINEL_TOKEN_PATTERNS

A frozen map of one regular-expression **string** per sentinel context — the
canonical source that is mirrored verbatim into
`app-manifest-v2.schema.json`'s `$defs`. A unit test asserts each schema `$def`'s
`pattern` equals the string here, so the schema and the resolver can never drift.

## Shape

```js
import { SENTINEL_TOKEN_PATTERNS } from '@conduction/nextcloud-vue'

// Readonly<Record<string, string>>
SENTINEL_TOKEN_PATTERNS.route // → '^@route\\.[A-Za-z][A-Za-z0-9_-]*$'
```

Keys are the six canonical contexts (`filter`, `config`, `object`, `workspace`,
`route`, `declarative`) plus a `deprecated` overlay kept in the schema union so
deployed manifests still validate during a migration window.

> **Note:** the values are JS string literals. A `\\.` in the source is the
> two-character sequence `\.` at runtime — exactly what the JSON schema stores
> after its own `\\.` is parsed. Compare PARSED values, never raw source. The
> object is `Object.freeze`d — treat it as read-only.

## See also

- [`SENTINEL_CONTEXTS`](./sentinel-contexts.md) — the canonical context names (excludes `deprecated`).
- [`SENTINEL_VOCABULARY`](./sentinel-vocabulary.md) — the human-readable companion catalog.
