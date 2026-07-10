# clearDeprecationWarnings

Test-only helper that resets the process-wide set of already-warned deprecated
tokens tracked by [`warnIfDeprecated`](./warn-if-deprecated.md). Production
callers do **not** need to invoke this — the dedup set is process-lifetime by
design (one warning per deprecated token, no spam).

## Why a warnings reset hook

`warnIfDeprecated` warns once per deprecated token for the whole process
lifetime. Across Jest cases that exercise the deprecation path repeatedly, the
dedup set silences subsequent warnings — making "this should warn" assertions
silently pass after the first case. `clearDeprecationWarnings()` lets each
`beforeEach` start with an empty dedup set.

## Signature

```js
import { clearDeprecationWarnings } from '@conduction/nextcloud-vue'

clearDeprecationWarnings()
```

| Argument | Type | Description |
|----------|------|-------------|
| — | — | No arguments. |

## Return value

Returns `undefined`.

## Usage

```js
import {
    warnIfDeprecated,
    clearDeprecationWarnings,
} from '@conduction/nextcloud-vue'

describe('deprecated tokens', () => {
    beforeEach(() => {
        clearDeprecationWarnings()
    })

    it('warns once for a deprecated token', () => {
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
        warnIfDeprecated('@config.legacyKey', warnSpy)
        warnIfDeprecated('@config.legacyKey', warnSpy)
        expect(warnSpy).toHaveBeenCalledTimes(1)
        warnSpy.mockRestore()
    })
})
```

## See also

- [`warnIfDeprecated`](./warn-if-deprecated.md) — the one-time warner this helper resets.
- [`clearRouteSentinelWarnings`](./clear-route-sentinel-warnings.md) — the equivalent test hook for `resolveRouteSentinels`.
