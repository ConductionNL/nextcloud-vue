---
sidebar_position: 49
---

# CnFlowStepOutcomes

Shows one named block of a step's run-log report, by bucket.

A messaging step (send email, send notification, post to Talk) writes its outcome onto the run log as `report.messaging`. A sync pipeline's steps write the same bucket shape for their own counts — `report.fetch`, `report.contract`, `report.write`, `report.sweep` (objects fetched, create/update/skip/invalid, created/updated, swept). Each outcome is a bucket with a count and a short sample. This component renders one block at a time.

```vue
<CnFlowStepOutcomes :report="step.report.messaging" />
<CnFlowStepOutcomes :report="step.report.write" :hide-zero="false" label="Write" />
```

[`CnFlowSidebar`](./cn-flow-sidebar.md) renders it for every block on a step — messaging and sync alike — under that step on a run's Logs tab, so you do not need to place it yourself to see it there.

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
| `fetched` | Fetched |
| `created` | Created |
| `updated` | Updated |
| `skipped` | Skipped |
| `invalid` | Invalid |
| `swept` | Swept |

By default, a bucket whose count is zero is left out — set `hideZero` to `false` to keep it. Messaging wants that suppression (a long, mostly-zero outcome list is noise); a sync block does not, since `swept: 0` is itself the answer, not a blank row. A bucket the component does not know still shows, under its key made readable: `heldForReview` reads "Held for review". When the server cut a list short (`truncated: true`), a line says so.

The names are in the library's own translations (English and Dutch).

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `report` | `Object` | `null` | One named block of a step's run-log report, e.g. `report.messaging` or a sync step's `report.write`. `null` renders nothing. |
| `labels` | `Object` | `{}` | Names to use instead of the built-in ones, keyed by bucket. Pass translated text. |
| `hideZero` | `Boolean` | `true` | Drop a bucket whose count is zero. Pass `false` for a sync block, where zero is itself the answer. |
| `label` | `String` | `null` | What this list is a tally of, e.g. `"Write"`. Shown as a caption above the list and used as the list's accessible name in place of the default "Who this step reached" — which is wrong for anything that is not a send, and leaves two sibling blocks on one step (`fetch` + `write`) unlabelled and indistinguishable to a screen reader. Leave unset for a messaging block. |

## Accessibility

The lists are a definition list: each name is a `dt`, its count and sample the `dd`. The colour bar on each row only repeats what the name already says. The list's accessible name is `label` when set, "Who this step reached" otherwise — pass `label` for every block that is not messaging, so two blocks on one step read as two distinct lists rather than one unlabelled pair.
