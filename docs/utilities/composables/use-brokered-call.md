# useBrokeredCall

Reactive composable that fetches from an **external provider through the OpenRegister credential broker**, so a no-code manifest app can render authenticated third-party API data **without ever handling the secret**. It is the engine behind the [`useDataSource`](./use-data-source.md) brokered form (`{ broker: { … } }`), and can also be used directly.

## Signature

```js
import { useBrokeredCall } from '@conduction/nextcloud-vue'

const { data, loading, error, refetch } = useBrokeredCall(config, options)
```

`config` may be an object, a ref, or a getter function for reactive inputs. When it lacks a `credentialId` or `path` the composable never queries and `data.value` stays `null`.

## Config

| Name | Type | Description |
|------|------|-------------|
| `credentialId` | `string` | The credential the current user owns (required). |
| `appId` | `string` | The manifest app id — must be in the credential's `allowedApps` (required). |
| `method` | `string` | Upstream HTTP method (default `'GET'`). |
| `path` | `string` | Upstream request path; may already include a query string (required). |
| `query` | `object` | Appended to `path` as a query string (arrays repeat the key). |
| `headers` | `object` | Extra upstream request headers. |
| `body` | `string \| null` | Upstream request body. |
| `responsePath` | `string` | Dot-path slice of the parsed body (via `selectByPath`). |

`options.immediate` — fetch on creation (default `true`).

## Returns

The same contract as [`useGraphQL`](./use-graph-q-l.md) / [`useDataSource`](./use-data-source.md):

| Field | Type | Description |
|-------|------|-------------|
| `data` | `Ref<any>` | Parsed upstream body (JSON when it looks like JSON), optionally sliced by `responsePath`. |
| `loading` | `Ref<boolean>` | True while the request is in flight. |
| `error` | `Ref<Error\|null>` | Clean, secret-free error on failure. |
| `refetch` | `() => Promise<void>` | Re-issue the request manually. |

## Zero-secret model

The browser never receives the credential. `useBrokeredCall` POSTs:

```
POST /apps/openregister/api/credentials/{credentialId}/session-request
{ "appId": "<manifest app id>", "method": "GET", "path": "/…?…", "headers": {…}, "body": null }
```

OpenRegister loads the credential the current user owns, verifies the app is in its `allowedApps`, injects the secret **server-side**, calls the upstream, and returns `{ status, headers, body }` where `body` is the raw upstream response string.

## Error handling

Failures never surface the secret or the upstream body:

- **403** — the broker refused (you don't own the credential, or the app isn't in `allowedApps`).
- **502** — the external provider could not be reached through the broker.
- Any other non-2xx upstream `status`, or a transport error, becomes a terse status-keyed `Error`.

## Notes

- Auth uses `@nextcloud/axios`, which attaches the session cookie and the CSRF `requesttoken` automatically — the endpoint is session-authenticated.
- Reactive `config` (a ref) re-runs the request on change (deep watch, so nested `query`/`headers` edits refetch).
