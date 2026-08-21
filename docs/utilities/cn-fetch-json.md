# cnFetchJson

[`cnFetch`](./cn-fetch.md) plus JSON parsing and error normalisation. The
everyday HTTP call for Conduction Nextcloud apps (**ADR-071 Decision 1**).

```js
import { cnFetchJson, CnHttpError } from '@conduction/nextcloud-vue'

const data = await cnFetchJson('/apps/openregister/api/objects/myreg/myschema', {
    query: { limit: 20 },
})
console.log(data.total, data.results)
```

## Signature

```js
cnFetchJson(url, options?) => Promise<*>
```

Takes the same arguments as [`cnFetch`](./cn-fetch.md). Returns the parsed body,
or `null` for an empty body. Throws [`CnHttpError`](../components/cn-http-error.md)
on any non-2xx.

## Three behaviours worth knowing

### An empty body resolves to `null`, it does not throw

`DELETE` endpoints in this stack answer `204`. Making the happy path throw
teaches callers to wrap everything in `try`/`catch` — and that is how real
errors get swallowed.

```js
await cnFetchJson(`/apps/openregister/api/objects/${reg}/${schema}/${id}`, {
    method: 'DELETE',
})   // → null
```

### Failures carry the status, not just a message

A bare `Error(message)` loses the status — the single most useful fact about a
failed request — and callers then re-parse the message string to recover it.
That is how a 404-vs-403 distinction gets lost.

```js
try {
    await cnFetchJson('/apps/myapp/api/thing/123')
} catch (e) {
    if (e instanceof CnHttpError && e.status === 403) {
        // branch on the status directly
    }
}
```

### The body is read once

A `Response` body is a stream. Calling `.json()` again on the error path throws
*"body stream already read"* and masks the real HTTP error, so the body is read
a single time via `text()` and reused for both paths. A non-JSON body (an HTML
error page behind a `500`, say) is preserved as raw text on `error.body` rather
than becoming a parse error that hides the status.

## See also

- [`cnFetch`](./cn-fetch.md) — the raw-`Response` form, for probes
- [`CnHttpError`](../components/cn-http-error.md)
