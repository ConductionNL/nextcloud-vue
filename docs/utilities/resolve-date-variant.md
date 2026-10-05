# resolveDateVariant

Turn "how far away is this date" into a colour variant. A deadline in five days reads differently from one that passed last week, and this is the one rule that decides which is which.

The rules have the `variantWhen` shape the stat tile uses: `[{ op, value, variant }]`, first match wins. They are compared against the number of calendar days from today until the date. `0` is today and a negative number is overdue.

## Parameters

| Name | Type | Description |
|------|------|-------------|
| `value` | `string \| number \| Date` | The date. A date-only string (`2026-10-05`) is read as a local day. |
| `rules` | `Array<{ op, value, variant }>` | `op` is `eq \| neq \| gt \| gte \| lt \| lte`. `value` is a number of days. `variant` is `success \| warning \| error \| default`. |
| `now` | `Date` | Optional. The reference moment. Defaults to the current time. |

## Returns

`string`: the variant of the first rule that matches, or `''` when none does or the value is not a date.

## Usage

```js
import { resolveDateVariant } from '@conduction/nextcloud-vue'

const rules = [
  { op: 'lt', value: 0, variant: 'error' },    // overdue
  { op: 'lte', value: 5, variant: 'warning' }, // within five days
]

resolveDateVariant('2026-10-01', rules, new Date(2026, 9, 5)) // → 'error'
resolveDateVariant('2026-10-08', rules, new Date(2026, 9, 5)) // → 'warning'
resolveDateVariant('2026-11-20', rules, new Date(2026, 9, 5)) // → ''
```

The `date` cell widget of [`CnCellRenderer`](../components/cn-cell-renderer.md) uses it. Use it yourself wherever a deadline needs the same colouring, such as a board card.
