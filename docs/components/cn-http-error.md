# CnHttpError

The error thrown by [`cnFetchJson`](../utilities/cn-fetch-json.md) on a non-2xx
response.

> **Not a Vue component.** It is exported with a `Cn` prefix because it is part
> of the `cnFetch` public surface, so the docs checker classifies it alongside
> the components. It is a plain `Error` subclass.

```js
import { cnFetchJson, CnHttpError } from '@conduction/nextcloud-vue'

try {
    await cnFetchJson('/apps/myapp/api/thing/123')
} catch (e) {
    if (e instanceof CnHttpError && e.status === 403) {
        // the caller can branch on the status directly
    }
}
```

## Properties

| Property | Type | Description |
|---|---|---|
| `name` | `string` | Always `'CnHttpError'`. |
| `message` | `string` | `"{url} returned {status}: {detail}"`, where `detail` is the response body's `error` field when present, else the status text. |
| `status` | `number` | The HTTP status code. |
| `body` | `*` | The parsed response body, or the raw text when it was not JSON. |
| `url` | `string` | The requested URL, for logs. |

## Why it carries the status and body

A bare `Error(message)` loses the status — the single most useful fact about a
failed request. Callers then re-parse the message string to recover it, which is
how a 404-vs-403 distinction gets lost.

`body` is preserved even when the response was not JSON: an HTML error page
behind a `500` stays readable on `error.body` instead of becoming a parse error
that hides the status.

## See also

- [`cnFetchJson`](../utilities/cn-fetch-json.md)
- [`cnFetch`](../utilities/cn-fetch.md)
