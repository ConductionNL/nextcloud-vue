# cnFetch

`fetch` with Nextcloud's URL prefix and headers applied. The library-owned HTTP
client named by **ADR-071 Decision 1**.

Raw `fetch()` with a hand-set `requesttoken` in app code is review-blocking once
shipped. Use this instead.

```js
import { cnFetch } from '@conduction/nextcloud-vue'

const response = await cnFetch('/apps/openregister/api/objects/myreg/myschema', {
    query: { limit: 20, _search: 'invoice' },
})
```

## Signature

```js
cnFetch(url, options?) => Promise<Response>
```

| Parameter | Type | Description |
|---|---|---|
| `url` | `string` | App-absolute path, e.g. `/apps/openregister/api/objects`. |
| `options` | `object` | Standard `fetch` options, plus the two below. |
| `options.query` | `object` | Serialised via `buildQueryString` and appended to the URL. |
| `options.headerOptions` | `object \| string \| null` | Passed through to `buildHeaders` (content type, organisation UUID, translation target). |

Returns the raw `Response`.

## What it does for you

- **`prefixUrl`** — Nextcloud may be served with or without `/index.php`. An API
  call must use the **same** prefix as the page, or the request is rejected.
- **`buildHeaders`** — the single blessed CSRF idiom
  (`requesttoken: OC.requestToken`), plus `Content-Type`, the OpenRegister
  organisation header and the translation-target header.
- **`buildQueryString`** — consistent query serialisation.

## It does NOT throw on a non-2xx

This is deliberate: a probe that legitimately expects a `404` can read
`response.status` without exception handling.

```js
const response = await cnFetch('/apps/myapp/api/thing/maybe-missing')
if (response.status === 404) {
    // a normal outcome here, not an error
}
```

For the common case — parse JSON, throw on failure — use
[`cnFetchJson`](./cn-fetch-json.md).

## Overriding a header

Caller-supplied headers win, so a one-off `Accept` does not require dropping to
raw `fetch`. That matters: bypassing the helper is how apps end up hand-setting
`requesttoken` again.

```js
await cnFetch('/apps/myapp/api/export', { headers: { Accept: 'text/csv' } })
```

## See also

- [`cnFetchJson`](./cn-fetch-json.md) — JSON parsing plus error normalisation
- [`CnHttpError`](../components/cn-http-error.md) — the error `cnFetchJson` throws
- `buildHeaders`, `buildQueryString`
