# CnDurationField

Edits an ISO 8601 duration as a number plus a unit (minutes, hours, days, weeks, months, years). `CnFormDialog` renders it for a property with `type: string` and `format: duration`, or for `fieldOverrides.<key>.widget: 'duration'`.

`P56D` shows 56 and days. Changing the unit writes the canonical string for that unit. A value that is not exactly one unit (`P1DT2H`) shows as read-only ISO text with an "Edit as ISO" button, so nothing is rounded. Clearing the number writes `null`. In `CnFormDialog`, a schema `minimum` or `maximum` given as an ISO string is compared in seconds.

## Usage

```vue
<CnDurationField v-model="term" input-label="Handling term" />
```

## Timer

With `timer` the field is a clock, for a length someone measures while it happens: a call, a visit, a repair.

```vue
<CnDurationField
	v-model="length"
	input-label="Duration"
	timer
	auto-start
	norm="PT5M"
	norm-label="Call time"
	timer-label="Call timer" />
```

- Start, Stop and Reset run the clock. Start carries on from the time it shows, and Reset stops it and writes `null`.
- It writes the running time into `modelValue` every second, so a form saved mid-run holds the time so far.
- The time comes from the start moment, not from counting ticks, so a throttled background tab stays right.
- The user can always type. `6` is six minutes, `04:23` is minutes and seconds, `1:04:23` adds hours. Typing stops the clock and keeps what was typed. Text that is no length shows an error and writes nothing.
- `autoStart` starts the clock when the field holds no value yet. A record with a saved duration does not start counting again. It also starts when `autoStart` turns true later, for example when a host binds it to a channel the user picks.
- `norm` shows the time against a length, with a bar and a percentage. From `normWarningPercent` the line turns the warning colour and says "Close to the norm". From 100% it turns the error colour and says "Over the norm".

In `CnFormDialog`, set `timer`, `autoStart`, `norm` and `normLabel` on the field through `fieldOverrides`.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | String | `null` | ISO 8601 duration string (v-model), or null. |
| `inputLabel` | String | `''` | Accessible label of the number input. |
| `unitLabel` | String | `'Unit'` | Accessible label of the unit select. |
| `disabled` | Boolean | `false` | Disable both inputs. |
| `error` | Boolean | `false` | Show the inputs in their error state. |
| `timer` | Boolean | `false` | Draw the field as a clock with Start, Stop and Reset. |
| `autoStart` | Boolean | `false` | With `timer`: start the clock when the field holds no value yet. |
| `norm` | String | `null` | With `timer`: an ISO 8601 length to show the time against. |
| `normWarningPercent` | Number | `80` | Percentage of `norm` from which the bar warns. |
| `normLabel` | String | `''` | Words before the time on the norm line. |
| `timerLabel` | String | `'Timer'` | Accessible name of the Start, Stop and Reset group. |
| `hint` | String | `''` | With `timer`: a line under the clock. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | `string \| null` | The ISO string for the chosen amount and unit; null when the amount is cleared. With `timer` it also carries the running time every second. |
| `started` | none | The clock started. |
| `stopped` | `string` | The clock stopped; carries the ISO string of the time. |
| `reset` | none | The clock stopped and the value was cleared. |
