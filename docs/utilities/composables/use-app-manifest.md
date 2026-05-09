# useAppManifest

Composable that loads and validates a Conduction app manifest. Backs [`CnAppRoot`](../../components/cn-app-root.md) and the wider JSON manifest renderer pattern.

## Three-phase flow

1. **Synchronous bundled load** — `bundledManifest` is the immediate value of the returned `manifest` ref. The app shell can render straight away from the bundled copy.
2. **Async backend merge** — fetches `/index.php/apps/\{appId\}/api/manifest` and deep-merges any `200` response over the bundled manifest. `4xx` / `5xx` / network errors are silently ignored, so apps work without a backend endpoint. The composable uses `axios.get` from `@nextcloud/axios` by default (CSRF token attached automatically).
3. **Validation** — the merged result is validated by [`validateManifest`](../validate-manifest.md). On failure, the bundled manifest is kept and a `console.warn` is emitted with the error list; `validationErrors` is set so the consumer can surface the issue.

The returned `manifest` is reactive, so the future "app builder" backend can hot-swap the manifest without a page reload.

## Signature

```js
import { useAppManifest } from '@conduction/nextcloud-vue'

const { manifest, isLoading, validationErrors } = useAppManifest(appId, bundledManifest, options)
```

| Argument | Type | Description |
|----------|------|-------------|
| `appId` | `string` | Nextcloud app ID. Used to build the default backend endpoint via `generateUrl` from `@nextcloud/router`, producing `/index.php/apps/\{appId\}/api/manifest`. |
| `bundledManifest` | `object` | Manifest shipped with the app — the synchronous default value. |
| `options.endpoint` | `string` | Override the backend fetch URL. Useful for tests and alternative-host deployments. |
| `options.fetcher` | `Function` | Override the fetch function. Must return a promise resolving to `{ status, data }`. Defaults to `axios.get`. |

## Return value

| Key | Type | Description |
|-----|------|-------------|
| `manifest` | `Ref<object>` | The reactive manifest. Starts as `bundledManifest`; replaced by the deep-merged result on a successful 200 + valid response. |
| `isLoading` | `Ref<boolean>` | `true` while the async fetch is in flight. Pass to `CnAppRoot.isLoading` to drive the loading phase. |
| `validationErrors` | `Ref<string[] \| null>` | `null` until the merged manifest fails validation, then the array of validator errors. Stays `null` on network failures (which fall back silently). |

## Usage

### Composition API

```js
import { useAppManifest } from '@conduction/nextcloud-vue'
import bundledManifest from './manifest.json'

const { manifest, isLoading } = useAppManifest('decidesk', bundledManifest)
```

### Options API (via `setup`)

```js
export default {
  setup() {
    return useAppManifest('decidesk', bundledManifest)
  },
}
```

### Tests / alternative endpoints

```js
useAppManifest('decidesk', bundledManifest, {
  endpoint: '/custom/manifest/url',
  fetcher: (url) => Promise.resolve({ status: 200, data: { /* ... */ } }),
})
```

## Deep-merge semantics

- Plain objects are merged recursively (own keys from `source` take precedence).
- Arrays are **replaced**, not concatenated — the typical override semantic for manifest fields like `menu` and `pages`.
- Non-object `source` values short-circuit and replace the target.

## Notes

- Validation failures **do not** swap the manifest; the bundled value stays in place and a warning is logged. Apps that want to surface validation errors to users should watch `validationErrors`.
- The async merge happens once on call; the composable does not subscribe to a stream. Hot-swap is achieved by mutating `manifest.value` from elsewhere.

## Related

- [CnAppRoot](../../components/cn-app-root.md) — Primary consumer (drives the loading phase via `isLoading`).
- [validateManifest](../validate-manifest.md) — The validator used internally.
- [useAppStatus](./use-app-status.md) — Companion composable for dependency detection.
