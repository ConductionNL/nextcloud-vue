# resolvePresetWindow

Resolves a preset id into a `{ from, to }` ISO-8601 UTC window ending at end-of-day today.

```js
import { resolvePresetWindow, DEFAULT_DATE_RANGE_PRESETS } from '@conduction/nextcloud-vue'

resolvePresetWindow('last-7', DEFAULT_DATE_RANGE_PRESETS)
// { from: '2026-05-15T00:00:00.000Z', to: '2026-05-21T23:59:59.999Z' }

resolvePresetWindow('custom', DEFAULT_DATE_RANGE_PRESETS)
// null  — `custom` (and any preset with days: null) is manual; caller preserves the current window
```

Arguments:

- `presetId` (string) — the preset id to resolve, e.g. `'last-30'`.
- `presets` (array) — the preset list (typically `DEFAULT_DATE_RANGE_PRESETS` or a consumer-supplied variant).
- `now` (Date, optional) — overrides `new Date()` for deterministic testing.

Returns `{ from, to }` strings or `null` for manual presets / unknown ids.

See [`CnDateRangePicker`](../components/cn-date-range-picker.md).
