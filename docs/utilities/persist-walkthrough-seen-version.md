# persistWalkthroughSeenVersion

Records the user's last-seen walkthrough app version so a completed or dismissed tour does not
reopen (ADR-043). Writes the `localStorage` mirror synchronously **and** `PUT`s the same per-user
preference that [`loadWalkthroughSeenVersion`](./load-walkthrough-seen-version.md) reads.

```js
import { persistWalkthroughSeenVersion } from '@conduction/nextcloud-vue'

// PUT /apps/{appId}/api/preferences/{configKey}  body: { value: "2.1.0" }
await persistWalkthroughSeenVersion('openbuild', 'walkthrough_completed_version', manifest.version)
```

| Param | Type | Description |
|-------|------|-------------|
| `appId` | `string` | The Nextcloud app id. |
| `configKey` | `string` | `manifest.walkthrough.completionConfigKey`. Empty ⇒ localStorage only, no request. |
| `version` | `string` | The app version to record as seen. |
| `options` | `object` | `{ http, storage }` — injection points for tests (default `@nextcloud/axios` and `window.localStorage`). |

Resolves to `true` when the server preference was written, `false` when there was no key to write
to or the request failed. Never rejects: the local mirror is already written, so a failed `PUT`
only means the tour may reopen on another device.

[`CnAppRoot`](../components/cn-app-root.md) calls this on the walkthrough's `complete` **and**
`dismiss` events, so the ✕ button, Skip, a backdrop click and ESC all persist. Mount
[`CnWalkthrough`](../components/cn-walkthrough.md) standalone and you must call it yourself —
without it the tour's full-viewport dim reopens on every visit and intercepts pointer events.

Read and write share one URL builder, so a persist can never land on a different key from the one
the load path reads. Values are normalised identically in both directions: only `null` /
`undefined` / `''` mean "never seen", so a version recorded as `0` or `false` still reads back as
seen instead of silently reverting the user to fresh-user state.
