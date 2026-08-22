# useSupportDialog

First-open visibility + dismiss persistence for [`CnSupportDialog`](../../components/cn-support-dialog.md). Each host app calls this once with its kebab-case `appSlug` and gets back a `visible` ref it binds to `<CnSupportDialog v-if="visible">`.

## Signature

```js
import { useSupportDialog } from '@conduction/nextcloud-vue'

const { visible, show, hide, reset } = useSupportDialog(appSlug, options)
```

| Argument | Type | Description |
|----------|------|-------------|
| `appSlug` | `string` | Kebab-case host-app id (e.g. `'decidesk'`). Namespaces the flag so two apps in the same session don't collide. |
| `options` | `object` (optional) | See below. |
| `options.persistence` | `'local' \| 'server'` | `'local'` (default) = per-browser localStorage. `'server'` = per-user, cross-device via the app's preferences endpoint, with a localStorage fallback. |
| `options.key` | `string` | Preference key (default `support-dialog-seen`). |
| `options.storage` | `Storage` | localStorage backend; defaults to `window.localStorage`. Injectable for tests. |
| `options.http` | `object` | axios instance; injectable for tests. |

## Return value

| Key | Type | Description |
|-----|------|-------------|
| `visible` | `Ref<boolean>` | `true` on first call when no `cn-support-dialog-shown:{slug}` flag exists; `false` otherwise. |
| `show` | `() => void` | Force the dialog visible (ignores the stored flag). |
| `hide` | `() => void` | Mark the dialog dismissed: persist `"1"` to storage and flip `visible.value` to `false`. |
| `reset` | `() => void` | Remove the persisted flag. Useful for tests or for a future "show again" admin action. |

## Persistence

- **`local`** (default) — synchronous; `visible` seeds from `localStorage["cn-support-dialog-shown:{slug}"]`. Zero backend, per-browser.
- **`server`** — `visible` starts `false` and resolves asynchronously from `GET /apps/{appSlug}/api/preferences/{key}` (so the note never flashes on a return visit); `hide()` issues `PUT …/{key}` with `{ value: '1' }`. Per-user, cross-device. On any failure (unauthenticated, endpoint missing, offline) it degrades to the `localStorage` flag, so the dialog is never a hard dependency on the backend. This is the mode [`CnAppRoot`](../../components/cn-app-root.md) uses for the fleet auto-mount; it requires the host app to expose the generic preferences endpoint (`GET`/`PUT /apps/{appId}/api/preferences/{key}`, backed by `IConfig` user values — see the nextcloud-app-template controller).

The composable is **slug-namespaced** so two Conduction apps in the same session each track their own "seen" flag.

## SSR / quota safety

Storage access is wrapped in try/catch. If `window` is undefined (SSR) or `localStorage` throws (Safari private mode, quota exceeded), the composable behaves as if the flag is already set — `visible` starts `false` and writes are silently no-ops. The dialog never becomes a hard dependency on a working localStorage.

## Caching

Per-`appSlug` handles are cached at module scope; calling `useSupportDialog('decidesk')` from two places in the same session returns the **same refs**, so a dismissal from anywhere propagates.

## Usage

```vue
<template>
  <CnSupportDialog
    v-if="visible"
    app-name="Decidiq"
    app-slug="decidesk"
    app-store-url="https://apps.nextcloud.com/apps/decidesk"
    feature-request-url="https://github.com/ConductionNL/decidesk/issues/new"
    @close="hide" />
</template>

<script>
import { CnSupportDialog, useSupportDialog } from '@conduction/nextcloud-vue'

export default {
  components: { CnSupportDialog },
  setup() {
    return useSupportDialog('decidesk')
  },
}
</script>
```

## See also

- [`CnSupportDialog`](../../components/cn-support-dialog.md) — the modal this composable controls.
- [`CnFeaturesAndRoadmapSidebar`](../../components/cn-features-and-roadmap-sidebar.md) — fourth container ("Show support note") opens the dialog even after the first-open prompt has been dismissed.
