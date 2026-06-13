# buildHeaders

Builds the standard Nextcloud request-header object required by the OCS API layer — the CSRF `requesttoken` and the `OCS-APIREQUEST` flag — plus an optional `Content-Type` and, for multi-tenant apps, the `X-OpenRegister-Organisation` tenancy header.

## Signature

Two call shapes are supported.

### 1. Positional (back-compat)

```js
import { buildHeaders } from '@conduction/nextcloud-vue'

buildHeaders()                              // Content-Type: 'application/json'
buildHeaders('application/x-www-form-urlencoded')
buildHeaders(null)                          // omit Content-Type (FormData uploads)
```

### 2. Options object

```js
buildHeaders({ contentType: 'application/json' })
buildHeaders({ contentType: null })
buildHeaders({ organisationUuid: 'org-uuid-123' })   // stamps X-OpenRegister-Organisation
buildHeaders({ contentType: null, organisationUuid: 'org-uuid-123' })
```

## Parameters

| Arg | Type | Default | Description |
|-----|------|---------|-------------|
| `opts` | `string \| object` | `'application/json'` | Either a Content-Type string (back-compat) or the options object documented below. |
| `opts.contentType` | `string \| null` | `'application/json'` | Value for the `Content-Type` header. Pass `null` (or falsy) to omit — required when posting `FormData` so the browser can write the multipart boundary. |
| `opts.organisationUuid` | `string \| null` | `null` | Active tenant UUID. When a non-empty string is passed, the returned object includes `X-OpenRegister-Organisation: <uuid>` — the FE side of the [`multi-tenancy-context`](./composables/use-tenant-context.md) capability, consumed server-side by OpenRegister's `MultiTenancyTrait`. |
| `opts.targetLanguage` | `string \| null` | `null` | BCP-47 target language for translation writes. When a non-empty string is passed, the returned object includes `X-Translation-Target-Language: <lang>`. |

## Returns

A plain object suitable for `fetch({ headers })`:

```js
{
  requesttoken: OC.requestToken,             // '' when OC is not on window
  'OCS-APIREQUEST': 'true',
  'Content-Type': 'application/json',        // only present when contentType is truthy
  'X-OpenRegister-Organisation': 'org-uuid', // only present when organisationUuid is a non-empty string
}
```

## Notes

- Reads `window.OC.requestToken`. On non-Nextcloud pages (unit tests, SSR) `OC` is `undefined`, so `requesttoken` falls back to an empty string.
- The store factories ([`createCrudStore`](./store-factories/create-crud-store.md), [`createObjectStore`](./store-factories/create-object-store.md)) call `buildHeaders({ organisationUuid })` internally on every fetch when wired via [`provideTenantContext`](./provide-tenant-context.md) — most consumers don't need to call this directly for tenancy.
- Pair with [`buildQueryString`](./build-query-string.md) when calling the OpenRegister API.
