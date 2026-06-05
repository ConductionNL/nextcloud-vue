# useRuntimeManifest

`useRuntimeManifest(appId, stubManifest?, options?)` is the runtime
manifest loader for v2 manifests. It fetches
`GET /apps/{appId}/api/manifest` via `@nextcloud/axios` +
`generateUrl`, validates the response against the v2 schema, and
falls back to a stub on failure.

## Import

```js
import { useRuntimeManifest } from '@conduction/nextcloud-vue'
```

## Signature

```ts
function useRuntimeManifest(
    appId: string,
    stubManifest?: object | null,
    options?: { fetcher?: (url: string) => Promise<{ status: number, data: object }> },
): {
    manifest: Ref<object | null>
    isLoading: Ref<boolean>
    validationErrors: Ref<string[] | null>
}
```

| Param | Type | Description |
| --- | --- | --- |
| `appId` | `string` | Nextcloud app ID. Used to build `GET /apps/{appId}/api/manifest`. |
| `stubManifest` | `object \| null` | Fallback manifest used on 404/error/validation failure. When omitted, `manifest.value` stays `null` on failure. |
| `options.fetcher` | `Function` | Override the fetch function. Must resolve to `{ status, data }`. Defaults to `axios.get`. Useful in tests. |

## Return shape

| Field | Type | Description |
| --- | --- | --- |
| `manifest` | `Ref<object \| null>` | The validated manifest, or the stub if the fetch/validation failed. |
| `isLoading` | `Ref<boolean>` | `true` until the fetcher promise settles. |
| `validationErrors` | `Ref<string[] \| null>` | Schema errors when validation failed; `null` on success. |

## Replace-not-merge

Unlike v1's deep-merge behaviour, v2 manifests are replaced wholesale.
A successful 200 response with a valid body completely replaces the
stub — no deep merge, no partial-update semantics. This keeps the
runtime surface deterministic.

## When does it fall back to the stub?

1. The fetcher rejects (network error, CORS, etc.).
2. The response is non-200 or has no `data`.
3. The response body fails `validateManifest()` (schema mismatch).

In every case `manifest.value` becomes the `stubManifest` you passed.
`validationErrors` is populated only in case (3).

## Example

```js
import { useRuntimeManifest } from '@conduction/nextcloud-vue'
import bundledManifest from './manifest.json'

const { manifest, isLoading, validationErrors } =
    useRuntimeManifest('openconnector', bundledManifest)

watch(validationErrors, (errs) => {
    if (errs?.length) {
        console.warn('[manifest] backend response failed validation, using bundled fallback:', errs)
    }
})
```

## Spec

- REQ-MVR-001 (manifest-v2-renderer)
- ADR-036 Decision 8 — backend-merge replaces, doesn't merge
