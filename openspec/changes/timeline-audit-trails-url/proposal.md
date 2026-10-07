# Proposal: timeline-audit-trails-url

kind: fix

## Why

On pipelinq's booking page the timeline said "Part of the timeline could not load: changes". `CnTimelineWidget` requested `/api/objects/{register}/{schema}/{id}/audit-trail`, while OpenRegister's route is `…/audit-trails`, so every audit source answered 404. The page's status history, with the reason for each status change, was not shown either, because the widget could not read a list held on the object.

## What changes

- The audit source requests `…/audit-trails`.
- A new `lists` source turns a list on the object (for example `statusHistory`) into dated events, with a label and a detail line per entry.
