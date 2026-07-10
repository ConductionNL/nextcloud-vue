# fetchEndpointSource

One-shot cached fetch of a Wave-2 `endpointSource` block — the imperative sibling of [`useEndpointSource`](./composables/use-endpoint-source.md) for Options-API fetch flows and services.

```js
import { fetchEndpointSource } from '@conduction/nextcloud-vue'

const payload = await fetchEndpointSource(
  { url: '/apps/pipelinq/api/analytics/overview', params: { period: '@workspace.datePreset?' }, responsePath: 'summary' },
  { workspace: { datePreset: 'month' } }, // token context
  { force: false },                       // force: true bypasses the shared cache
)
```

Behaviour (shared with the composable):

- `params` values resolve through the SAME `@`-token grammar widget filters use; optional (`…?`) tokens drop when unresolved, an unresolved REQUIRED token returns `null` without a request.
- Requests dedupe + short-TTL cache per `(method, url, resolved params)` — module-wide, so concurrent callers share ONE http call.
- The response is plucked at `responsePath` (dot-path); `undefined` plucks return `null`.
- App-relative URLs route through `generateUrl`; absolute (`http`/`https`) URLs pass untouched.
- `method: 'POST'` sends the resolved params as the JSON body.

See [`invalidateEndpointSourceCache`](./invalidate-endpoint-source-cache.md) to drop the shared cache.
