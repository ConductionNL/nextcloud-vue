# invalidateEndpointSourceCache

Drops every cached endpoint response (and any in-flight dedup entry) held by the shared [`useEndpointSource`](./composables/use-endpoint-source.md) engine.

```js
import { invalidateEndpointSourceCache } from '@conduction/nextcloud-vue'

invalidateEndpointSourceCache()
```

Use it:

- in **tests**, from a `beforeEach`, so mocked responses never leak between cases;
- in **hard refresh flows** an app implements outside the built-in `cn:page:refresh` / `cn:widget:refresh` bus wiring (which already force-refetch past the cache on their own).

The next `useEndpointSource` re-resolution or [`fetchEndpointSource`](./fetch-endpoint-source.md) call after an invalidation issues a fresh request.
