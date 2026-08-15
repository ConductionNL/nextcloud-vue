# `resolveRouteSentinels(value, params, pageId)`

Substitutes every `@route.<param>` string in `value` with the matching
vue-router param. Called by `CnPageRenderer.resolvedProps()` before any
other config merge so route-bound config fields surface as the resolved
value (or `null` if the param is missing).

## Why a sentinel

`CnPageRenderer.resolvedProps()` already merges `$route.params` *over*
`pages[].config`, so a top-level `id` param becomes a top-level prop on
the dispatched page component. But nested values inside `config.filter`,
`config.dataSource`, `config.config`, etc. have no escape hatch — there's
no way to say *"this nested key should be the route param"* declaratively.

`@route.<param>` fills that gap. It's the runtime sibling of `@resolve:`
(which is resolved by the loader against `IAppConfig` at manifest-load
time): `@route.<param>` is resolved by the renderer against
`$route.params` at render time.

## Sentinel syntax

```
@route.<param>
```

`<param>` matches `[A-Za-z][A-Za-z0-9_-]*` — leading letter, then
alphanumerics, underscores, or hyphens. The whole string must be the
sentinel (no leading/trailing text, no dotted paths).

Examples:

| Input | `params` | Output |
|-------|----------|--------|
| `"@route.id"` | `{ id: "42" }` | `"42"` |
| `"@route.catalogSlug"` | `{ catalogSlug: "open-data" }` | `"open-data"` |
| `"@route.missing"` | `{}` | `null` (+ one-shot `console.warn`) |
| `"@route.foo.bar"` | `{ foo: ... }` | `"@route.foo.bar"` (not a sentinel; dotted paths unsupported) |
| `"some text @route.id"` | any | `"some text @route.id"` (not exact-match) |
| `42`, `true`, `null` | any | passthrough |

## Where the sentinel is allowed

Anywhere inside `pages[].config` — typically a deep field like:

```json
{
  "type": "index",
  "route": "/publications/:catalogSlug",
  "config": {
    "register": "opencatalogi",
    "schema": "publication",
    "filter": { "catalog": "@route.catalogSlug" }
  }
}
```

`CnPageRenderer.resolvedProps()` walks the entire `config` subtree
before flattening, so any nested key can carry a sentinel.

## Signature

```ts
import { resolveRouteSentinels } from '@conduction/nextcloud-vue'

resolveRouteSentinels(
  value: unknown,
  params: Record<string, string>,
  pageId?: string,
): unknown
```

Returns a deep-copy of `value` with sentinels resolved. The original
input is not mutated.

## Empty-state semantics

When a sentinel references a param that's not in `params`:

1. The output value is `null` (not the original sentinel string, not
   `undefined`).
2. A one-shot `console.warn` is emitted for the `(pageId, sentinel)`
   pair. Subsequent references to the same sentinel from the same page
   are silent.

The dedup set is per-page-lifetime; test code can call
`clearRouteSentinelWarnings()` to drop it between cases.

## Cross-reference

- [`resolveManifestSentinels`](./resolve-manifest-sentinels.md) — the
  manifest-load-time sibling that handles `@resolve:` (IAppConfig).
- [`CnPageRenderer`](../components/cn-page-renderer.md) — the
  consumer; `resolvedProps()` calls this resolver on every render.
