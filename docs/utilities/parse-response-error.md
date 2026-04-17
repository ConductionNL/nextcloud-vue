# parseResponseError

Parses an HTTP error `Response` into a unified `ApiError` shape used across the object store and sub-resource plugins. Selects a human-readable message per status code and extracts per-field validation errors when present.

## Signature

```js
import { parseResponseError } from '@conduction/nextcloud-vue'

const response = await fetch(url, { headers: buildHeaders() })
if (!response.ok) {
  const error = await parseResponseError(response, 'client')
  // { status, message, details, isValidation, fields, toString() }
}
```

## Parameters

| Arg | Type | Description |
|-----|------|-------------|
| `response` | `Response` | The failed fetch `Response` object. |
| `type` | `string` | Object type slug, inserted into the default messages (e.g. `'client'` → `"The requested client could not be found"`). |

## Returns — `ApiError`

```ts
{
  status: number,            // HTTP status code
  message: string,           // Human-readable, ready to display
  details: string | object | null,   // body.errors || body.error || body.message
  isValidation: boolean,     // true for 400/422
  fields: object | null,     // body.validationErrors || body.errors — per-field errors
  toString(): string,        // returns `message`, so the object can be used in template strings
}
```

## Message selection

| Status | Default message |
|--------|-----------------|
| `400`, `422` | `details` if it's a string, else `"Validation failed for <type>"` — `isValidation: true`. |
| `401` | `"Session expired, please log in again"` |
| `403` | `"You do not have permission to perform this action"` |
| `404` | `"The requested <type> could not be found"` |
| `409` | `"This <type> was modified by another user. Please reload."` |
| `>= 500` | `"An unexpected server error occurred. Please try again."` |
| other | `response.statusText` or `"An unexpected error occurred"` |

## Notes

- If the response body is not JSON, `details`/`fields` are left `null` but the message still reflects the status code.
- The `toString()` member makes the returned value safe to concatenate or interpolate, e.g. `` `Failed: ${error}` `` yields the message.
- On successful responses, do **not** call this function — it is intended for the `!response.ok` branch.

## Related

- [networkError](./network-error.md) — Counterpart for fetch failures with no response.
- [genericError](./generic-error.md) — Counterpart for arbitrary caught exceptions.
