# buildQueryString

Serialises a params object into a URL query string, with special-case handling for empty values, arrays, and nested objects.

## Signature

```js
import { buildQueryString } from '@conduction/nextcloud-vue'

buildQueryString({ _search: 'foo', _page: 1, _limit: 20 })
// '?_search=foo&_page=1&_limit=20'

buildQueryString({})              // ''
buildQueryString({ tags: [] })    // ''
```

## Behaviour

Rules applied to each key/value pair, in order:

| Value | Result |
|-------|--------|
| `undefined`, `null`, `''` | key is **skipped** |
| Empty array `[]` | key is **skipped** |
| Empty plain object `{}` | key is **skipped** |
| Non-empty array | appended once per element (e.g. `tags=a&tags=b`). Empty/null entries inside the array are also skipped. |
| Non-empty plain object | serialised via `JSON.stringify` (single param value). Used for `_order: { field: 'asc' }` and similar. |
| Primitive | stringified via `String(value)`. |

Returns `'?' + ...` when any params survive, else the empty string.

## Typical use

Used inside the object-store actions to build list-endpoint URLs:

```js
const url = `${base}/${register}/${schema}` + buildQueryString({
  _limit: 20,
  _page: 1,
  _search: 'alice',
  _order: { createdAt: 'desc' },       // JSON.stringify'd
  status: ['open', 'pending'],         // repeated param
})
```

## Related

- [buildHeaders](./build-headers.md) — Companion HTTP helper.
