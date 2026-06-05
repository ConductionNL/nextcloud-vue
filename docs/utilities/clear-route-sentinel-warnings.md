# clearRouteSentinelWarnings

Test-only helper that resets the per-page `(pageId, sentinel)` dedup
set used by [`resolveRouteSentinels`](./resolve-route-sentinels.md).
Production callers do **not** need to invoke this — the dedup set is
page-lifetime by design (one warning per page+sentinel pair, no spam).

## Why a warnings reset hook

`resolveRouteSentinels` warns once per `(pageId, sentinel)` pair when a
sentinel references a route param that's not in `$route.params`. Across
Jest cases that exercise the missing-param path repeatedly, the dedup
set silences subsequent warnings — making "this should warn" assertions
silently pass after the first case. `clearRouteSentinelWarnings()` lets
each `beforeEach` start with an empty dedup set.

## Signature

```js
import { clearRouteSentinelWarnings } from '@conduction/nextcloud-vue'

clearRouteSentinelWarnings()
```

| Argument | Type | Description |
|----------|------|-------------|
| — | — | No arguments. |

## Return value

Returns `undefined`.

## Usage

```js
import {
    resolveRouteSentinels,
    clearRouteSentinelWarnings,
} from '@conduction/nextcloud-vue'

describe('my page', () => {
    beforeEach(() => {
        clearRouteSentinelWarnings()
    })

    it('warns when the param is missing', () => {
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
        resolveRouteSentinels({ x: '@route.id' }, {}, 'my-page')
        expect(warnSpy).toHaveBeenCalledTimes(1)
        warnSpy.mockRestore()
    })
})
```

## See also

- [`resolveRouteSentinels`](./resolve-route-sentinels.md) — the resolver this helper supports.
- [`clearResolveCache`](./clear-resolve-cache.md) — the equivalent test hook for `resolveManifestSentinels`.
