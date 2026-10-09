# CnDurationField

Edits an ISO 8601 duration as a number plus a unit (minutes, hours, days, weeks, months, years). `CnFormDialog` renders it for a property with `type: string` and `format: duration`, or for `fieldOverrides.<key>.widget: 'duration'`.

`P56D` shows 56 and days. Changing the unit writes the canonical string for that unit. A value that is not exactly one unit (`P1DT2H`) shows as read-only ISO text with an "Edit as ISO" button, so nothing is rounded. Clearing the number writes `null`. In `CnFormDialog`, a schema `minimum` or `maximum` given as an ISO string is compared in seconds.

## Usage

```vue
<CnDurationField v-model="term" input-label="Handling term" />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | String | `null` | ISO 8601 duration string (v-model), or null. |
| `inputLabel` | String | `''` | Accessible label of the number input. |
| `unitLabel` | String | `'Unit'` | Accessible label of the unit select. |
| `disabled` | Boolean | `false` | Disable both inputs. |
| `error` | Boolean | `false` | Show the inputs in their error state. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | `string \| null` | The ISO string for the chosen amount and unit; null when the amount is cleared. |
