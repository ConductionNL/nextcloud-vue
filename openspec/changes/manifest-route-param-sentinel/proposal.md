# Manifest `@route.<param>` sentinel — bind route params into config

## Why

The opencatalogi customs-to-zero triage ([opencatalogi#636](https://codeberg.org/Conduction/opencatalogi/pulls/636)) flagged that `PublicationIndexView` is a `type:'custom'` wrapper *only* because its filter depends on a route parameter:

```js
// /publications/:catalogSlug
const filter = { catalog: this.$route.params.catalogSlug }
```

`CnPageRenderer.resolvedProps()` already merges `$route.params` over `pages[].config` (URL truth wins on key collisions). So a top-level `id` param surfaces as a prop. But nested values inside `config.filter` / `config.config` / `config.dataSource` / etc. have no escape hatch — there's no way to author `config.filter.catalog = $route.params.catalogSlug` declaratively today.

`@resolve:<key>` sentinels (manifest-resolve-sentinel) cover the IAppConfig case; `@route.<param>` is the equivalent for vue-router params.

## What changes

1. **Sentinel utility** — `resolveRouteSentinels(value, params)` walks any subtree replacing `@route.<param>` strings (exact match) with `params[param]`. Pattern: `@route.<alphanumeric-or-underscore-or-dash>`.
2. **Renderer** — `CnPageRenderer.resolvedProps()` runs the resolver over `currentPage.config` before the existing merges. Unresolved sentinels (param not in `$route.params`) substitute to `null` and emit a single `console.warn` per page lifetime.
3. **Schema** — bump version + add a docstring on `config` mentioning the new sentinel alongside `@resolve:`.
4. **Validator** — no new error path (sentinel is a free-form string; the resolver handles resolution at render time). Validator already accepts arbitrary strings in `config.*`.
5. **Tests** — `resolveRouteSentinels` unit spec + a `CnPageRenderer` test asserting `config.filter.catalog = "@route.catalogSlug"` resolves to the actual param on route push.
6. **Docs** — `docs/migrating-to-manifest.md` (or closest equivalent) gains a "Route params in config" section.

## Non-goals

- Two-way binding (resolved value back into the route).
- Template expressions beyond exact-match `@route.<param>` (`@route.params.foo`, dotted paths, default values). Future scope if real-world use cases need them.
- Built-in coercion (`@route.id` is always a string per vue-router; the consumer is responsible for parsing).

## Consumer impact

Unblocks opencatalogi `PublicationIndexView`:

```json
{
  "id": "Publications",
  "route": "/publications/:catalogSlug",
  "type": "index",
  "config": {
    "register": "opencatalogi",
    "schema": "publication",
    "filter": { "catalog": "@route.catalogSlug" }
  }
}
```

## References

- [nextcloud-vue#276](https://codeberg.org/Conduction/nextcloud-vue/issues/276)
- `src/utils/resolveManifestSentinels.js` — `@resolve:` precedent.
- `CnPageRenderer.resolvedProps()` — where the merge already happens.
