# DEFAULT_DATE_RANGE_PRESETS

Frozen default list of preset entries used by `CnDateRangePicker` (and by `CnDashboardPage`'s `dateRange` header when `presets` is omitted).

```js
import { DEFAULT_DATE_RANGE_PRESETS } from '@conduction/nextcloud-vue'

// [
//   { id: 'today',   label: 'Today',          days: 1 },
//   { id: 'last-7',  label: 'Last 7 days',    days: 7 },
//   { id: 'last-30', label: 'Last 30 days',   days: 30 },
//   { id: 'last-90', label: 'Last 90 days',   days: 90 },
//   { id: 'custom',  label: 'Custom range',   days: null },
// ]
```

Each preset:

- `id` — stable identifier (also the value emitted on the `preset` field).
- `label` — human-readable label shown in the dropdown.
- `days` — window length in days, ending at end-of-day UTC today. `null` marks a manual / custom preset.

See [`CnDateRangePicker`](../components/cn-date-range-picker.md) and [`resolvePresetWindow`](./resolve-preset-window.md).
