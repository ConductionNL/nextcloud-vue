# genericError

Wraps an arbitrary caught exception into the same `ApiError` shape returned by [`parseResponseError`](./parse-response-error.md) and [`networkError`](./network-error.md). Use it as the default fallback in a `catch` block when neither a `Response` nor a network `TypeError` is available.

## Signature

```js
import { genericError, networkError } from '@conduction/nextcloud-vue'

try {
  await somethingThatMightThrow()
} catch (err) {
  state.error = err.name === 'TypeError'
    ? networkError(err)
    : genericError(err)
}
```

## Parameters

| Arg | Type | Description |
|-----|------|-------------|
| `error` | `Error` | The caught exception. |

## Returns — `ApiError`

```js
{
  status: null,                 // unknown — neither an HTTP status nor a network failure
  message: error.message,
  details: null,
  isValidation: false,
  fields: null,
  toString(): string,
}
```

## Related

- [parseResponseError](./parse-response-error.md) — For HTTP response errors.
- [networkError](./network-error.md) — For fetch `TypeError` failures.
