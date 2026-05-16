# clearResolveCache

Test-only helper that resets the per-page IAppConfig resolution cache used by [`resolveManifestSentinels`](./resolve-manifest-sentinels.md). Production callers do **not** need to invoke this — the cache is page-lifetime by design, consistent with the manifest's load-once model.

## Why a cache reset hook

The default `getAppConfigValue` resolver caches each `(appId, key)` lookup so that five `@resolve:foo_register` references in five pages share a single fetch. In a Jest test that mocks the resolver across multiple cases, stale cache entries leak across cases and cause "previous test's value" assertions to fail. `clearResolveCache()` lets a test's `beforeEach` start each case with an empty cache.

## Signature

```js
import { clearResolveCache } from '@conduction/nextcloud-vue'

clearResolveCache()
```

| Argument | Type | Description |
|----------|------|-------------|
| — | — | No arguments. |

## Return value

Returns `undefined`.

## Usage

```js
import { clearResolveCache, resolveManifestSentinels } from '@conduction/nextcloud-vue'

beforeEach(() => {
  clearResolveCache()
})

it('substitutes the sentinel from the test fixture', async () => {
  const { manifest } = await resolveManifestSentinels(/* ... */)
  // Cache is fresh for this case.
})
```

## See also

- [resolveManifestSentinels](./resolve-manifest-sentinels.md) — The utility that owns the cache.
