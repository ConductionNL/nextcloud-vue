# useAppInstaller

Install-and-enable (or just enable) a missing Nextcloud app dependency from within a Conduction app's dependency surface, without leaving the app. Backs the admin-aware action buttons on [`CnDependencyMissing`](../../components/cn-dependency-missing.md), the [`CnAppRoot`](../../components/cn-app-root.md) `or-missing` guard, and every soft-dependency banner.

Spec: `openspec/changes/dependency-hardsoft-install-actions` (REQ-DIA-1).

## Why

Nextcloud exposes a one-call primitive that downloads the app from the (signature-verified) app store if it is missing, runs its migrations, and enables it. So a single call covers **both** "install and enable" (not installed) and "enable" (installed but disabled); only the calling button's *label* differs. The endpoint is:

- **admin-only** — non-admins cannot call it, so surfaces branch on `getCurrentUser().isAdmin`;
- **CSRF-protected** — handled automatically by `@nextcloud/axios`;
- **`#[PasswordConfirmationRequired]`** — the admin must confirm their password. The **modern** NC34+ route declares this in **strict** mode, which changes *how* the confirmation is delivered (see below). A cancelled/rejected confirmation short-circuits without ever installing the app.

## Password confirmation — strict (modern) vs session (legacy)

The NC34+ OCS enable route is `#[PasswordConfirmationRequired(strict: true)]` (`apps/appstore/lib/Controller/ApiController.php::enableApp`). In **strict** mode Nextcloud's `PasswordConfirmationMiddleware` **ignores the session `last-password-confirm` timestamp** and requires an `Authorization: Basic base64(login:password)` header **on the request itself**; a session-based `confirmPassword()` can therefore *never* satisfy it — it 403s with `Required authorization header missing`.

The canonical client mechanism — the one NC34's own `appstore` front-end uses — is `@nextcloud/password-confirmation`'s **axios interceptors**:

- `addPasswordConfirmationInterceptors(axios)` is called **once at module load** (the package guards against double-registration; it is a no-op for requests without a `confirmPassword` flag).
- The modern POST is tagged `{ confirmPassword: PwdConfirmationMode.Strict }`. The request interceptor then prompts for the password in a dialog and injects it as `config.auth = { username: getCurrentUser().uid, password }` — which axios serialises to the required `Authorization: Basic …` header — for **that single request only**. The password is never stored. This mirrors NC34's `appstore-main` bundle verbatim: `axios.post(enableUrl, { appId, groups }, { confirmPassword: Strict })`.

The **legacy** `settings/apps/enable` route is non-strict, so the session `confirmPassword()` still satisfies it — that call is kept **only on the fallback path**. The two paths are mutually exclusive per Nextcloud major, so a normal NC34+ install prompts **exactly once** (strict, in the request); the rare ≤NC33 fallback prompts once via the session dialog.

Both the strict interceptor and the session `confirmPassword()` reject with `Error('Dialog closed')` when the admin dismisses the prompt; the composable treats that as a quiet abort — `error` stays `null` and no legacy fallback is attempted.

## Endpoint strategy (NC34+ OCS, ≤NC33 legacy fallback)

The install route moved between Nextcloud majors, so two are tried in order:

1. **NC34+ — bundled `appstore` app OCS API.** `POST /ocs/v2.php/apps/appstore/api/v1/apps/enable` with a **singular** `{ appId, groups: [] }` body (`generateOcsUrl('/apps/appstore/api/v1/apps/enable')`). Success returns a `200` OCS envelope (`data.ocs.data.update_required`); failure is an OCS `500` whose message lives at `data.ocs.meta.message`. The old settings route was **removed** in NC34 (405).
2. **≤NC33 — legacy settings controller.** `POST /index.php/settings/apps/enable` with a **plural** `{ appIds: [appId], groups: [] }` body (`generateUrl('/settings/apps/enable')`). This is only reached when the OCS route is **absent** — i.e. the OCS call fails with HTTP `404` or `405`. **Any other OCS error (500, 403, network) is a real failure and is NOT retried on the legacy route.**

`error` is filled from the OCS envelope (`data.ocs.meta.message`) or the legacy shape (`data.data.message` / `data.message`), falling back to a generic message.

## Adoption notes

`@nextcloud/password-confirmation@5` (used for both the strict interceptor and the legacy session `confirmPassword()`) imports `spawnDialog` from `@nextcloud/dialogs` **^6** — an export that does not exist in dialogs older than 6. Since the library now **bundles both `@nextcloud/password-confirmation` and `@nextcloud/dialogs` into its dist**, consumers that webpack-alias `@nextcloud/dialogs` to a pre-6 version keep building and running unchanged: the install action uses the bundled dialogs ^6 internally, while the app's own `@nextcloud/dialogs` imports keep resolving through its alias.

**Local-dev caveat**: apps that build against nc-vue *source* (e.g. a `useLocalLib` webpack alias to `../nextcloud-vue/src`) bypass the dist bundle — on that path `@nextcloud/dialogs` resolves from the app's own `node_modules`, and a pre-6 copy still fails with `spawnDialog was not found`. For local-lib development either install `@nextcloud/dialogs@^6` in the app or set `useLocalLib = false`.

## Signature

```js
import { useAppInstaller } from '@conduction/nextcloud-vue'

const { installing, error, installAndEnable } = useAppInstaller()
```

## Return value

| Key | Type | Description |
|-----|------|-------------|
| `installing` | `Ref<boolean>` | `true` for the whole duration (download + migrations can take 10–30s), `false` once settled. Drive a busy / disabled button. |
| `error` | `Ref<string \| null>` | `null` until a failure, then the server's message (OCS `ocs.meta.message` or legacy `data.message`, or a generic fallback). Surface inline so the original store link stays usable. |
| `installAndEnable` | `(appId: string) => Promise<void>` | POSTs the NC34+ OCS appstore endpoint with a strict in-request password confirmation, falling back to the legacy `/settings/apps/enable` route (with a session `confirmPassword()`) on a 404/405. Resolves on HTTP 200; rejects on a cancelled password prompt (with `error` left `null`) or an enable failure. |

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

- **Strict confirm-in-request (modern)** — the OCS POST carries `{ confirmPassword: PwdConfirmationMode.Strict }`; the interceptor prompts and attaches the Basic-auth header to that request. No separate `confirmPassword()` call.
- **Cancelled prompt** — the strict interceptor (or the legacy `confirmPassword()`) rejects with `Error('Dialog closed')`; `error` stays `null`, no legacy fallback is attempted, `installing` returns to `false`, and the promise rejects.
- **Version fallback** — a `404`/`405` from the OCS route (older NC without the `appstore` app) runs a session `confirmPassword()` then retries the legacy `/settings/apps/enable` route; every other error (500, **403**, network) is surfaced as-is and is **never** retried on the legacy route.
- **Failure** — `error` is set from the OCS `ocs.meta.message` or legacy `data.message` (or `'Could not install and enable the app'`), `installing` returns to `false`, and the promise rejects so the caller can fall back to the store link.

## Testing

The password-confirmation + enable round-trip is admin-only and mutates the live instance (it installs real apps), so it is **@e2e-excluded** and covered by `@vue/test-utils` unit tests with `@nextcloud/axios` and `@nextcloud/password-confirmation` mocked at the network / password-dialog boundary only. Because the real strict interceptor is mocked out, a cancelled strict prompt is simulated by the modern POST rejecting with `Error('Dialog closed')` (the exact error the interceptor throws). Coverage includes: the interceptors registered once at load, the modern OCS success path carrying the strict flag, a cancelled strict prompt (no fallback, no error), the 404/405 → legacy fallback (with session `confirmPassword()`), a cancelled legacy prompt, the "modern 500/403 does NOT fall back" invariants, and OCS/legacy error-message extraction.

## Related

- [CnDependencyMissing](../../components/cn-dependency-missing.md) — Full-page blocking screen for HARD dependencies; uses this composable.
- [CnAppRoot](../../components/cn-app-root.md) — `or-missing` guard + soft-dependency banners; uses this composable.
- [useAppStatus](./use-app-status.md) — Detects per-app installed/enabled status.
