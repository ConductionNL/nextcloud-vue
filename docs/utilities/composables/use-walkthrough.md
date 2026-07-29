# useWalkthrough

The walkthrough engine (ADR-043). Loads `manifest.walkthrough`, composes the active
tour for the current user + app version, and runs a step machine whose advancement is
fed declarative **signals** by the rendering component
([`CnWalkthrough`](../../components/cn-walkthrough.md)) — keeping the composable pure
and unit-testable. Captured route params / object ids land in a context bag
interpolated into later steps via `{{var}}`.

## Signature

```js
import { useWalkthrough } from '@conduction/nextcloud-vue'

const wt = useWalkthrough(appId, manifest, { seenVersion, resume, onComplete })
```

| Argument | Type | Description |
|----------|------|-------------|
| `appId` | `string` | Nextcloud app id (cache key). |
| `manifest` | `object` | Reads `manifest.walkthrough` + `manifest.version`. |
| `options.appVersion` | `string` | Override the running app version. |
| `options.seenVersion` | `string` | The user's last-seen app version (version composition). |
| `options.resume` | `object` | `{ tourId, stepId }` to resume at (refresh / cross-app). |
| `options.onComplete` | `function` | Called with `appVersion` when a tour completes. |

## Returns

`{ tours, activeTour, autoStartTour, currentStep, totalSteps, isFirst, isLast,
context, running, start, restart, next, back, skip, jumpTo, dismiss, complete,
notify, interpolate }`.

- **Version composition** — a fresh user (no `seenVersion`) gets all steps
  `<= appVersion`; an upgraded user gets only steps newer than `seenVersion` and
  `<= appVersion` (the "what's new" tour). `autoStartTour` is the tour that should
  auto-start given the user's version + the tour `trigger`.
- **`notify(signal)`** — feed an advance signal:
  `{ kind: 'route'|'object-created'|'element'|'click'|'delay', route?, params?, object? }`.
  When it satisfies the active step's `advanceOn`, captures run and the tour advances.

## Helpers

`compareSemver(a, b)` and `interpolateTokens(str, context)` are exported alongside for
version comparison and `{{var}}` substitution.

## Completion persistence

The composable itself stays pure — `seenVersion` comes in, `onComplete` goes out. The
round trip against the manifest's `walkthrough.completionConfigKey` is exported
separately and used by [`CnAppRoot`](../../components/cn-app-root.md):

```js
import {
  loadWalkthroughSeenVersion,
  persistWalkthroughSeenVersion,
} from '@conduction/nextcloud-vue'

// GET /apps/{appId}/api/preferences/{configKey}
const seenVersion = await loadWalkthroughSeenVersion(appId, configKey)
// PUT the same URL with { value: appVersion }
await persistWalkthroughSeenVersion(appId, configKey, manifest.version)
```

Both mirror into `localStorage` (`cn-walkthrough-seen:{appId}`) so the next boot
resolves synchronously, both fall back to that mirror when the endpoint is absent or
the user is unauthenticated, and neither ever rejects. With no `configKey` the
persistence is per-browser only — which is why a fresh browser profile (every
Playwright run) reopens the tour unless the manifest declares the key.

`normaliseSeenVersion(value)` is the shared read/write normaliser: only `null` /
`undefined` / `''` mean "never seen", so a recorded `0` / `false` / `'0'` still counts
as seen rather than silently reverting the user to a fresh-user state.

## Example

```js
const wt = useWalkthrough('pipelinq', manifest, { seenVersion: '1.0.0' })
wt.start('getting-started')
// the user creates a product → the component sources the signal:
wt.notify({ kind: 'object-created', object: { '@self': { schema: 'product', id: '42' } } })
// productId is now 42 in wt.context.value, interpolated into later steps
```
