# NcSelectTags (override)

`@conduction/nextcloud-vue` re-exports a corrected `NcSelectTags` that **shadows** the component of the same name from `@nextcloud/vue`. Consumers import it exactly as before — the barrel transparently substitutes the fixed version:

```js
import { NcSelectTags } from '@conduction/nextcloud-vue'
```

The public prop / event / slot contract is unchanged from upstream (see the [@nextcloud/vue NcSelectTags docs](https://nextcloud-vue-components.netlify.app/)). Only two behaviours are corrected:

1. **Tolerant systemtags fetch.** Upstream parses the `/systemtags/` PROPFIND multistatus assuming `d:response` is always an array. An instance with **no system tags** returns a single `<d:response>` (the collection root, with a `404` propstat), so the XML→JSON step yields an object; upstream's `for…in` loop then walks the object's keys and dereferences `undefined['d:status']`, throwing `Cannot read properties of undefined (reading 'd:status')` (logged as *"Loading systemtags failed"*). The override fetches through `searchSystemTags`, which tolerates that shape and returns an empty list instead.

2. **Consumer `:options` take precedence.** Upstream ignores `:options` whenever `fetchTags` is `true` (its default), so any call site that passes its own option list (e.g. a list of groups) silently gets system tags instead. The override surfaces a non-empty `:options` as-is and only fetches system tags when none are provided — matching how every consumer already uses the component.

The override `extends` the upstream component, so all props, slots, `v-model` wiring and rendering are inherited unchanged; only the data source is replaced. Source: [`src/components/NcSelectTags/`](../../src/components/NcSelectTags/).

## Behaviour matrix

| Consumer passes | Result |
| --- | --- |
| no `:options` | Fetches system tags via `searchSystemTags()` (empty list when the instance has none — no error) |
| non-empty `:options` | Renders exactly those options; no fetch is performed |

> **Do not set `:fetch-tags`.** The override fetches system tags on its own whenever no `:options` are given, so the prop is redundant. Worse, setting `:fetch-tags="true"` makes upstream's own (merged-in) `created()` hook run its broken parser *in addition* to ours — a wasted PROPFIND plus a misleading `"Loading systemtags failed"` console error, even though tags still load correctly. The override can't suppress the inherited hook, so it emits a dev-mode `console.warn` instead. Leave the prop unset.

---

## `searchSystemTags()`

Fetches the instance's system tags via a WebDAV `PROPFIND` on `/remote.php/dav/systemtags/` and returns them parsed. Unlike upstream, it resolves to an **empty array** when the instance has no system tags rather than throwing.

```js
import { searchSystemTags } from '@conduction/nextcloud-vue/src/components/NcSelectTags/searchSystemTags.js'

const tags = await searchSystemTags()
// → [{ id: 3, displayName: 'Confidential', canAssign: true, userAssignable: true, userVisible: true }, …]
// → []  when the instance has no system tags
```

**Returns** `Promise<Array<{ id: number, displayName: string, canAssign: boolean, userAssignable: boolean, userVisible: boolean }>>`.

Request errors (network / auth) reject as usual; the caller (`NcSelectTags`) catches them and falls back to an empty list. CSRF/auth headers are added automatically by `@nextcloud/axios`.

---

## `parseSystemTags(xml)`

Parses a `/systemtags/` PROPFIND multistatus response body into tag objects. Split out from `searchSystemTags()` so the parsing is unit-testable without a network call.

```js
import { parseSystemTags } from '@conduction/nextcloud-vue/src/components/NcSelectTags/searchSystemTags.js'

parseSystemTags(xmlString)
// → [{ id, displayName, canAssign, userAssignable, userVisible }, …]
```

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `xml` | `string` | The raw XML multistatus body. A non-string or empty value yields `[]`. |

**Returns** `Array<{ id, displayName, canAssign, userAssignable, userVisible }>` — empty when there are no tags.

It walks the DOM by namespace (`DAV:` and `http://owncloud.org/ns`) rather than by string-keyed JSON, which makes it immune to the single-vs-array response shape and to namespace-prefix differences. Any `<d:propstat>` whose `<d:status>` is not `200` (e.g. the `404` on the collection root) is skipped, as is any response missing an `oc:id`.

---

## Tested Nextcloud versions

The systemtags WebDAV endpoint and its multistatus response shape are server-version dependent, so these functions are validated per Nextcloud major version:

| Nextcloud | Status |
| --- | --- |
| 33 | ✅ Verified |

Append rows here as the response shape is reverified on other versions (the JSDoc `@tested` tag on each function tracks the same list).
