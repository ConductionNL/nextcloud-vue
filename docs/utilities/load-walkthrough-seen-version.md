# loadWalkthroughSeenVersion

Reads the user's last-seen walkthrough app version from the per-user preference named by
`manifest.walkthrough.completionConfigKey` (ADR-043). [`CnAppRoot`](../components/cn-app-root.md)
calls this before mounting [`CnWalkthrough`](../components/cn-walkthrough.md); mount the overlay
yourself and you need it too, or the tour reopens on every visit.

```js
import { loadWalkthroughSeenVersion } from '@conduction/nextcloud-vue'

// GET /apps/{appId}/api/preferences/{configKey}
const seenVersion = await loadWalkthroughSeenVersion('openbuild', 'walkthrough_completed_version')
```

| Param | Type | Description |
|-------|------|-------------|
| `appId` | `string` | The Nextcloud app id. |
| `configKey` | `string` | `manifest.walkthrough.completionConfigKey`. Empty ⇒ no request; the localStorage mirror is returned as-is. |
| `options` | `object` | `{ http, storage }` — injection points for tests (default `@nextcloud/axios` and `window.localStorage`). |

Resolves to the last-seen version, or `''` for a user who has never completed or dismissed the
tour. Never rejects.

The server preference is authoritative (it is per-USER, so it follows the user across devices and
browser profiles); `localStorage` (`cn-walkthrough-seen:{appId}`) is a synchronous mirror used as
the fallback when no key is declared, the endpoint is absent, the user is unauthenticated, or the
request fails. A response that is not a JSON object carrying a `value` field — the SPA index HTML
Nextcloud serves with status 200 for apps that don't route `/api/preferences/{key}` — is treated as
"endpoint absent", not as "never seen".

Only `null`, a missing `value`, and `''` mean "never seen". A recorded value that happens to be
JS-falsy (`0`, `false`, `"0"`) still counts as seen — see
[`persistWalkthroughSeenVersion`](./persist-walkthrough-seen-version.md) for the write side.
