# useSetupStatus

Composable that reports an app's first-time-setup status (ADR-042). Backs
[`CnAppRoot`](../../components/cn-app-root.md)'s `setup` phase (gate on
required-unmet) and drives [`CnSetupWizard`](../../components/cn-setup-wizard.md).

## Signature

```js
import { useSetupStatus } from '@conduction/nextcloud-vue'

const { requiredUnmet, optionalUnmet, completed, loading, refresh } = useSetupStatus(appId, manifest)
```

| Argument | Type | Description |
|----------|------|-------------|
| `appId` | `string` | Nextcloud app id (e.g. `'procest'`). |
| `manifest` | `object` | The app manifest; reads `manifest.setup.steps[].required`. |

It fetches `GET /apps/{appId}/api/setup/status` →
`{ version, completed, steps: { <id>: { done, detail } } }`, caches the result
per `appId` for the page lifetime, and cross-references the manifest's `required`
flags. On error it falls back to "nothing done" so a failed lookup never crashes
the shell.

One error is treated as an answer rather than a failure. A **401/403** means the
caller may not read setup state — setup endpoints are admin-only — so `completed`
reports `true` and the wizard stays out of the way. Without that, every non-admin
user of an app with a `setup` block met a wizard they had no permission to
complete instead of the app itself. Any other error (network, 500) stays unknown
and still falls back to "nothing done", so an admin can always reach the wizard.

## Return value

| Key | Type | Description |
|-----|------|-------------|
| `steps` | `ComputedRef<object[]>` | The manifest steps merged with their server `done`/`detail`. |
| `status` | `Ref<object>` | The raw server status payload. |
| `requiredUnmet` | `ComputedRef<object[]>` | Required steps that are not yet done — non-empty ⇒ gate the app. |
| `optionalUnmet` | `ComputedRef<object[]>` | Optional steps not yet done — auto-open the wizard once (dismissible). |
| `completed` | `ComputedRef<boolean>` | Server completion flag, never true while a required step is unmet — but always true when `forbidden`. |
| `enabled` | `boolean` | Whether the manifest declares an active `setup` block. |
| `loading` | `Ref<boolean>` | `true` while the status fetch is in flight. |
| `error` | `Ref<Error\|null>` | The last fetch error, if any. |
| `forbidden` | `Ref<boolean>` | `true` when the server answered 401/403 — the caller is not an admin, so setup is not their concern. |
| `refresh` | `() => Promise<void>` | Re-fetch the status (call after a step completes). |

## Notes

- Mirrors [`useAppStatus`](./use-app-status.md): one shared fetch + reactive state per `appId`.
- Gating uses `requiredUnmet`; the optional auto-open uses `optionalUnmet` + `completed`.
