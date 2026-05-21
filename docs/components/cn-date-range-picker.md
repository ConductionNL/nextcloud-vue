# CnDateRangePicker

Preset-driven date range selector wrapping two `NcDateTimePicker`s and a preset `NcSelect`. Used internally by `CnDashboardPage`'s `dateRange` header and exposed publicly so bespoke screens can reuse the same control without composing the primitives themselves.

## Usage

```vue
<template>
  <CnDateRangePicker v-model="range" />
</template>

<script>
export default {
  data() {
    return {
      range: {
        from: '2026-05-15T00:00:00.000Z',
        to: '2026-05-21T23:59:59.999Z',
        preset: 'last-7',
      },
    }
  },
}
</script>
```

Selecting a preset (other than `custom`) auto-fills both pickers to `now − days` → `now`. Selecting `custom` (or any preset with `days: null`) keeps both pickers manually editable; typing in either picker emits `preset: 'custom'` so the parent knows the user dialled in a bespoke window.

## Props

| Prop         | Type     | Default                          | Description                                           |
| ------------ | -------- | -------------------------------- | ----------------------------------------------------- |
| `value`      | Object   | `null`                           | Current `{ from, to, preset }` value (ISO-8601 UTC).  |
| `presets`    | Array    | `DEFAULT_DATE_RANGE_PRESETS`     | Preset list: `{ id, label, days }`. `days: null` = manual. |
| `disabled`   | Boolean  | `false`                          | Disables both date pickers and the preset select.    |
| `dateFormat` | String   | `'YYYY-MM-DD'`                   | Forwarded to `NcDateTimePicker`'s `format` prop.     |
| `presetLabel`| String   | `'Range preset'`                 | A11y label for the preset dropdown.                  |
| `fromLabel`  | String   | `'From'`                         | A11y label for the start-of-range picker.            |
| `toLabel`    | String   | `'To'`                           | A11y label for the end-of-range picker.              |

## Events

| Event   | Payload                                     | Description                                                          |
| ------- | ------------------------------------------- | -------------------------------------------------------------------- |
| `input` | `{ from: string, to: string, preset: string }` | Emitted on preset selection or manual edit. Use `v-model` to bind. |

## Default presets

The exported `DEFAULT_DATE_RANGE_PRESETS` constant mirrors the defaults applied by `CnDashboardPage` when `dateRange.presets` is omitted:

```js
[
  { id: 'today',   label: 'Today',          days: 1 },
  { id: 'last-7',  label: 'Last 7 days',    days: 7 },
  { id: 'last-30', label: 'Last 30 days',   days: 30 },
  { id: 'last-90', label: 'Last 90 days',   days: 90 },
  { id: 'custom',  label: 'Custom range',   days: null },
]
```

## Helpers

- [`DEFAULT_DATE_RANGE_PRESETS`](../utilities/default-date-range-presets.md) — the canonical preset list.
- [`resolvePresetWindow(presetId, presets, now?)`](../utilities/resolve-preset-window.md) — pure helper that returns `{ from, to }` for a preset id, or `null` for manual / unknown ids.
