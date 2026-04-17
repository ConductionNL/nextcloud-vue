# buildHeaders

Builds the standard Nextcloud request-header object required by the OCS API layer — the CSRF `requesttoken` and the `OCS-APIREQUEST` flag — plus an optional `Content-Type`.

## Signature

```js
import { buildHeaders } from '@conduction/nextcloud-vue'

buildHeaders()                             // { requesttoken, OCS-APIREQUEST, Content-Type: 'application/json' }
buildHeaders('application/x-www-form-urlencoded')
buildHeaders(null)                         // omit Content-Type (let the browser set it — needed for FormData uploads)
```

## Parameters

| Arg | Type | Default | Description |
|-----|------|---------|-------------|
| `contentType` | `string \| null` | `'application/json'` | Value for the `Content-Type` header. Pass `null` (or falsy) to omit the header — required when posting `FormData` so the browser can write the multipart boundary. |

## Returns

A plain object suitable for `fetch({ headers })`:

```js
{
  requesttoken: OC.requestToken,       // '' when OC is not on window
  'OCS-APIREQUEST': 'true',
  'Content-Type': 'application/json',  // only present when contentType is truthy
}
```

## Notes

- Reads `window.OC.requestToken`. On non-Nextcloud pages (unit tests, SSR) `OC` is `undefined`, so `requesttoken` falls back to an empty string.
- Pair with [`buildQueryString`](./build-query-string.md) when calling the OpenRegister API.
