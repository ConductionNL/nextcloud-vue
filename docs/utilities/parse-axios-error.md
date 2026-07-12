# parseAxiosError

Unpack an **axios** error into the parts a caller needs to explain itself.

```js
import { parseAxiosError } from '@conduction/nextcloud-vue'

try {
    await axios.delete(generateUrl(`/apps/openregister/api/schemas/${id}`))
} catch (e) {
    const { status, code, message, data } = parseAxiosError(e)
    if (code === 'schema-has-objects') {
        // Actionable: tell the user WHY, and offer a way forward.
        this.error = `That schema still has ${data.objectCount} object(s).`
    } else {
        this.error = message || 'Could not delete the schema.'
    }
}
```

## Why this exists

Axios's `error.message` is only ever the generic **"Request failed with status code 409"**. The server's actual explanation is sitting untouched on `error.response.data`. So the very common

```js
catch (e) { this.error = e.message }        // ← throws the real reason away
```

shows the user an HTTP status instead of what went wrong. `parseAxiosError` pulls the real content back out.

OpenRegister returns machine-readable refusals such as `{ error: 'schema-has-objects', objectCount: 3 }`. The `code` field carries that slug, so a caller can branch on it and render something specific and actionable rather than echoing a status code.

## Not the same as `parseResponseError`

[`parseResponseError`](./parse-response-error.md) takes a **fetch `Response`** and is `async` (it awaits `.json()`). Axios has already parsed the body, so the two are not interchangeable. Use:

| You have | Use |
|---|---|
| An axios error (`error.response.data`) | `parseAxiosError` (sync) |
| A fetch `Response` | `parseResponseError` (async) |

## Signature

```
parseAxiosError(error) → { status, code, message, data }
```

| Field | Type | Description |
|-------|------|-------------|
| `status` | `number` | HTTP status, or `0` when the request never got a response (network failure). |
| `code` | `string \| null` | The server's machine-readable error slug (`data.error`), when it sent one. |
| `message` | `string \| null` | The best human-readable string in the body (`data.message`, else `data.error`, else a bare-string body). `null` when the server sent nothing usable — fall back to your own copy. |
| `data` | `object \| null` | The raw response body, for fields beyond the message (e.g. `objectCount`). |

Safe on any input: an error with no `response` at all (a network failure) yields `{ status: 0, code: null, message: null, data: null }`.
