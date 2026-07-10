# useAppInstaller

Install-and-enable (or just enable) a missing Nextcloud app dependency from within a Conduction app's dependency surface, without leaving the app. Backs the admin-aware action buttons on [`CnDependencyMissing`](../../components/cn-dependency-missing.md), the [`CnAppRoot`](../../components/cn-app-root.md) `or-missing` guard, and every soft-dependency banner.

Spec: `openspec/changes/dependency-hardsoft-install-actions` (REQ-DIA-1).

## Why

Nextcloud exposes a one-call primitive — `POST /index.php/settings/apps/enable` — that downloads the app from the (signature-verified) app store if it is missing, runs its migrations, and enables it. So a single call covers **both** "install and enable" (not installed) and "enable" (installed but disabled); only the calling button's *label* differs. The endpoint is:

- **admin-only** — non-admins cannot call it, so surfaces branch on `getCurrentUser().isAdmin`;
- **CSRF-protected** — handled automatically by `@nextcloud/axios`;
- **`#[PasswordConfirmationRequired]`** — which is why `confirmPassword()` from `@nextcloud/password-confirmation` MUST run first. A cancelled/rejected confirmation short-circuits without ever calling the endpoint.

## Signature

```js
import { useAppInstaller } from '@conduction/nextcloud-vue'

const { installing, error, installAndEnable } = useAppInstaller()
```

## Return value

| Key | Type | Description |
|-----|------|-------------|
| `installing` | `Ref<boolean>` | `true` for the whole duration (download + migrations can take 10–30s), `false` once settled. Drive a busy / disabled button. |
| `error` | `Ref<string \| null>` | `null` until a failure, then the server's `data.message` (or a generic fallback). Surface inline so the original store link stays usable. |
| `installAndEnable` | `(appId: string) => Promise<void>` | Confirms the password, then `POST /settings/apps/enable` with `{ appIds: [appId], groups: [] }`. Resolves on HTTP 200; rejects on a cancelled confirmation or an enable failure. |

## Usage

```js
const { installing, error, installAndEnable } = useAppInstaller()

async function install(appId) {
  try {
    await installAndEnable(appId)
    // A freshly installed app's JS/CSS and its OC.appswebroots entry only
    // exist after a full page load, and useAppStatus caches results
    // module-side for the page lifetime — so reload rather than hot-mount.
    window.location.reload()
  } catch (e) {
    // error.value holds the message (empty on a cancelled password dialog);
    // keep the store link as a manual fallback.
  }
}
```

## Behaviour

- **Confirm-then-enable** — `confirmPassword()` runs first; on resolve the endpoint is called.
- **Cancelled confirmation** — the endpoint is NOT called and `installing` stays `false` (the promise rejects with the confirmation's rejection).
- **Failure** — `error` is set from `response.data.message` (or `'Could not install and enable the app'`), `installing` returns to `false`, and the promise rejects so the caller can fall back to the store link.

## Testing

The `confirmPassword()` + `settings/apps/enable` round-trip is admin-only and mutates the live instance (it installs real apps), so it is **@e2e-excluded** and covered by `@vue/test-utils` unit tests with `@nextcloud/axios` and `@nextcloud/password-confirmation` mocked at the network / password-dialog boundary only.

## Related

- [CnDependencyMissing](../../components/cn-dependency-missing.md) — Full-page blocking screen for HARD dependencies; uses this composable.
- [CnAppRoot](../../components/cn-app-root.md) — `or-missing` guard + soft-dependency banners; uses this composable.
- [useAppStatus](./use-app-status.md) — Detects per-app installed/enabled status.
