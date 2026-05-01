# useAppStatus

Composable that reports whether a given Nextcloud app is installed and enabled. Backs [`CnAppRoot`](../../components/cn-app-root.md)'s dependency-check phase — one call per id in `manifest.dependencies`.

## Signature

```js
import { useAppStatus } from '@conduction/nextcloud-vue'

const { installed, enabled, loading } = useAppStatus(appId)
```

| Argument | Type | Description |
|----------|------|-------------|
| `appId` | `string` | Nextcloud app id (e.g. `'openregister'`, `'opencatalogi'`). |

## Return value

| Key | Type | Description |
|-----|------|-------------|
| `installed` | `Ref<boolean>` | `true` when the app is detected on the current page. |
| `enabled` | `Ref<boolean>` | Mirrors `installed` for the current detection strategy (apps that ship as `appswebroots` are by definition enabled for the current user). |
| `loading` | `Ref<boolean>` | `true` while detection runs. Detection is synchronous, so this flips to `false` before the first reactive flush — kept on the API for forward compatibility with async backends. |

## Detection order

| Step | Source | Why |
|------|--------|-----|
| 1 | `OC.appswebroots[appId]` | Global object Nextcloud injects on every authenticated page. Contains a key per app **enabled for the current user** — the most reliable signal and doesn't require the target app to opt into capabilities. |
| 2 | `getCapabilities()[appId]` | Fallback when `OC` is unavailable (mostly tests). Only apps implementing `\OCP\Capabilities\ICapability` advertise themselves here. |

Most Conduction / OpenRegister-backed apps do **not** register a capability key — that's why the `appswebroots` check has to come first. Capabilities-only detection would falsely report installed apps as missing.

On any thrown error during detection, `installed` and `enabled` stay `false` and a `console.warn` is logged. A failed lookup never crashes the app shell.

## Caching

Per-`appId` results are cached at module scope; subsequent calls for the same `appId` return the **same refs**, so all consumers share state. The cache lives for the page lifetime (until reload).

## Usage

### Inside CnAppRoot (typical)

CnAppRoot reads `manifest.dependencies` and calls `useAppStatus(id)` for each entry; nothing else is needed.

```vue
<CnAppRoot :manifest="manifest" app-id="decidesk" />
```

### Standalone

```js
import { useAppStatus } from '@conduction/nextcloud-vue'

const { installed, enabled } = useAppStatus('openregister')
// installed.value / enabled.value are immediately readable.
```

## Notes

- Tests can reset the cache via the `__resetAppStatusCacheForTests` internal helper (not exported from the package barrel).
- The composable is intentionally generic over `appId` so it works for any Nextcloud app, not just Conduction ones.

## Related

- [CnAppRoot](../../components/cn-app-root.md) — Primary consumer.
- [CnDependencyMissing](../../components/cn-dependency-missing.md) — The screen rendered when this composable reports a dependency as missing.
- [useAppManifest](./use-app-manifest.md) — Loads the manifest whose `dependencies` drive the calls.
