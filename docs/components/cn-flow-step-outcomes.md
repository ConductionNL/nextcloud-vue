---
sidebar_position: 49
---

# CnFlowStepOutcomes

Shows who a send step reached, and who it did not, by name.

A messaging step (send email, send notification, post to Talk) writes its outcome onto the run log as `report.messaging`. Each outcome is a bucket with a count and a short sample. This component lists every bucket that has someone in it.

```vue
<CnFlowStepOutcomes :report="step.report.messaging" />
```

[`CnFlowSidebar`](./cn-flow-sidebar.md) renders it under each step on a run's Logs tab, so you do not need to place it yourself to see it there.

## What it shows

| Bucket | Shown as |
|---|---|
| `delivered` | Delivered |
| `optedOut` | Opted out |
| `authorityUnavailable` | Not sent, the opt-out check did not answer |
| `skippedByPreference` | Skipped by their notification settings |
| `skippedByKillSwitch` | Skipped, sending is switched off |
| `rateLimited` | Held back by the send limit |
| `refusedRecipients` | Refused by the step's address rule, each with its reason |
| `unknownRecipients` | Not a known user or group |
| `failed` | Failed |

Empty buckets are left out. A bucket the component does not know still shows, under its key made readable: `heldForReview` reads "Held for review". When the server cut a list short (`truncated: true`), a line says so.

The names are in the library's own translations (English and Dutch).

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `report` | `Object` | `null` | The step's messaging report, `report.messaging` on its run-log entry. `null` renders nothing. |
| `labels` | `Object` | `{}` | Names to use instead of the built-in ones, keyed by bucket. Pass translated text. |

## Accessibility

The lists are a definition list: each name is a `dt`, its count and sample the `dd`. The colour bar on each row only repeats what the name already says.
