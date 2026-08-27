# CnCronField

A schedule builder that writes a standard five-field cron expression.

```vue
<CnCronField v-model="config.cron" :label="t('myapp', 'Runs')" />
```

Cron is a precise notation and an unreadable one. `0 9 * * 1` is exact, and nobody reads it at a glance — so a bare text box asks every author to know a syntax in order to say "every Monday morning", and gives no feedback at all until the schedule fails to fire at a time nobody is watching.

## The three views are one value

The named schedule, the part pickers and the expression are the same value seen three ways:

- picking **Every week** rewrites the expression
- typing an expression **re-selects** the schedule it matches
- an expression matching none of them selects **Custom…**, which is not a failure state — it is every schedule the presets cannot name

The expression stays visible and editable in all modes. A builder that hides the value it produces cannot express what cron can, and cannot be checked by someone who already knows what they want.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `modelValue` | `String` | `''` | The cron expression, as five space-separated fields. |
| `label` | `String` | `''` | Label for the schedule picker. |
| `disabled` | `Boolean` | `false` | Whether every control is disabled. |

## Events

| Event | Payload | When |
|---|---|---|
| `update:modelValue` | `string` | The expression changed. Always five space-separated fields, never a `@shortcut`. |

## What it will not produce

**`@daily` and its siblings.** Which shortcuts a scheduler resolves varies by implementation, and a schedule that validates and never fires is worse than one that is refused. Output is always five fields — the form every cron implementation agrees on.

**A day of the month above 28.** A schedule on the 31st silently skips the months that do not have one, which the author cannot see until February. Typing `0 9 31 * *` by hand still works and still validates; the builder simply will not steer anyone into it.

## Invalid input is emitted, not swallowed

Keystrokes are never rejected. Almost every prefix of a valid expression is itself invalid, so a field that refused them would be impossible to type in. The error text says what is wrong and the caller decides whether to save — pair it with OpenRegister's `format: "cron"`, which refuses the write.

## The summary says nothing rather than something wrong

`describeCron()` names only the shapes the builder produces. Anything else returns an empty string instead of an approximation: a summary that confidently describes a *different* schedule than the one that will run is worse than no summary, because it is believed.

So `0 9 * * 1` reads as "Every Monday at 09:00", and `0 9 * * 1-5` — a perfectly valid expression — reads as nothing at all.

## Related

- `parseCron` / `isValidCron` / `describeCron` in [`src/utils/cron.js`](../utilities/cron.md)
- OpenRegister's `format: "cron"` validates the same grammar server-side
