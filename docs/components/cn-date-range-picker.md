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
| `modelValue` | Object   | `undefined`                      | The same value under Vue 3's v-model name. `v-model` binds THIS, not `value` — both are accepted. |
| `presets`    | Array    | `DEFAULT_DATE_RANGE_PRESETS`     | Preset list. Each entry declares ONE window kind: `period` (current calendar week/month/quarter/year to date), `hours` (rolling N-hour window) or `days` (rolling N whole days). `days: null` = manual. |
| `disabled`   | Boolean  | `false`                          | Disables both date pickers and the preset select.    |
| `dateFormat` | String   | `'yyyy-MM-dd'`                   | Forwarded to `NcDateTimePicker`'s `format` prop. **date-fns tokens** — see note below. |
| `presetLabel`| String   | `'Range preset'`                 | A11y label for the preset dropdown.                  |
| `fromLabel`  | String   | `'From'`                         | A11y label for the start-of-range picker.            |
| `toLabel`    | String   | `'To'`                           | A11y label for the end-of-range picker.              |

> **Why two props.** Vue 3 compiles `v-model="x"` to `:modelValue` + `@update:modelValue`. A component declaring only `value`/`input` never receives the prop and its emit is never heard — silently. `value` is kept as the public name for existing consumers; `modelValue` is what a plain `v-model` binds, and both emit on every change.


### `dateFormat` uses date-fns tokens, not moment's

`@nextcloud/vue` 9 replaced `NcDateTimePicker`'s moment.js backend with
date-fns. date-fns **throws** — it does not warn — on `YYYY` (year-of-week) and
`DD` (day-of-year) where `yyyy` and `dd` are meant, so a moment-style format
string stops the picker rendering at all.

The default changed from `'YYYY-MM-DD'` to `'yyyy-MM-dd'` for this reason. If
you pass `dateFormat` explicitly, substitute accordingly:

| moment (v8) | date-fns (v9) |
| ----------- | ------------- |
| `YYYY`      | `yyyy`        |
| `DD`        | `dd`          |
| `MM`        | `MM` (unchanged) |

## Events

| Event   | Payload                                     | Description                                                          |
| ------- | ------------------------------------------- | -------------------------------------------------------------------- |
| `input` | `{ from: string, to: string, preset: string }` | Emitted on preset selection or manual edit. Use `v-model` to bind. |

## Default presets

The exported `DEFAULT_DATE_RANGE_PRESETS` constant mirrors the defaults applied by `CnDashboardPage` when `dateRange.presets` is omitted:

```js
[
  { id: 'last-8h',  label: 'Last 8 hours',  hours: 8 },
  { id: 'last-24h', label: 'Last 24 hours', hours: 24 },
  { id: 'today',    label: 'Today',         days: 1 },
  { id: 'last-7',   label: 'Last 7 days',   days: 7 },
  { id: 'last-30',  label: 'Last 30 days',  days: 30 },
  { id: 'last-90',  label: 'Last 90 days',  days: 90 },
  { id: 'custom',   label: 'Custom range',  days: null },
]
```

## Preset kinds

A preset declares exactly one window kind. They are resolved in this order:

| Kind      | Shape                                        | Window                                                        |
| --------- | -------------------------------------------- | ------------------------------------------------------------- |
| `period`  | `{ id, label, period: 'week' \| 'month' \| 'quarter' \| 'year' }` | The **current calendar unit to date** — start of the unit through end-of-day today. |
| `hours`   | `{ id, label, hours: N }`                    | **Rolling**, ending at the exact current instant (`now − N hours → now`). |
| `days`    | `{ id, label, days: N }`                     | **Rolling** whole days: midnight UTC of the `(N-1)`-th day back through end-of-day UTC today. |

**`period` is not the same as `days`.** `{ period: 'month' }` on 21 May resolves
to **1 May → 21 May**; `{ days: 30 }` resolves to **22 April → 21 May**. Use
`period` whenever the label says "current" / "this" — labelling a rolling
`days: 30` window "Current month" misstates what the numbers cover. Weeks use
ISO semantics and start on Monday.

```js
[
  { id: 'week',    label: 'Current week',    period: 'week' },
  { id: 'month',   label: 'Current month',   period: 'month' },
  { id: 'quarter', label: 'Current quarter', period: 'quarter' },
  { id: 'year',    label: 'Current year',    period: 'year' },
  { id: 'all',     label: 'All',             days: null },
]
```

**Starting range from the manifest.** `CnDashboardPage`'s `dateRange.default`
accepts either an explicit `{ from, to }` window or just a preset id — e.g.
`dateRange: { enabled: true, default: { preset: 'last-7' } }` resolves the
window from the preset at mount, so a dashboard can declare its initial range by
name without hard-coding dates.

## Helpers

- [`DEFAULT_DATE_RANGE_PRESETS`](../utilities/default-date-range-presets.md) — the canonical preset list.
- [`resolvePresetWindow(presetId, presets, now?)`](../utilities/resolve-preset-window.md) — pure helper that returns `{ from, to }` for a preset id, or `null` for manual / unknown ids.
