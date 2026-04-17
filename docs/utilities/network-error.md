# networkError

Wraps a caught `fetch` failure (where no HTTP response was received) into the same `ApiError` shape returned by [`parseResponseError`](./parse-response-error.md). Use it inside a `catch` block when `error.name === 'TypeError'` — the typical signature of an offline/DNS/CORS failure.

## Signature

```js
import { networkError } from '@conduction/nextcloud-vue'

try {
  await fetch(url, { headers: buildHeaders() })
} catch (err) {
  if (err.name === 'TypeError') {
    state.error = networkError(err)
  }
}
```

## Parameters

| Arg | Type | Description |
|-----|------|-------------|
| `error` | `Error` | The caught exception from `fetch`. |

## Returns — `ApiError`

```js
{
  status: 0,                       // 0 signals "no HTTP response"
  message: error.message || 'A network error occurred. Check your connection and try again.',
  details: null,
  isValidation: false,
  fields: null,
  toString(): string,              // returns `message`
}
```

## Related

- [parseResponseError](./parse-response-error.md) — For errors where a `Response` *is* returned.
- [genericError](./generic-error.md) — For non-network exceptions.
