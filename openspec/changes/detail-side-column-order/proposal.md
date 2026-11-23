# Proposal: detail-side-column-order

## Why

In the board look a detail page's side column puts a notice first and the History card last, as the Dq boards draw it.
Some boards draw History on top: PqMailinglijst shows Geschiedenis above the sign-up form and the subscriber preview.
The History card there also reads three changes, while the timeline widget ignored `limit` and listed every read of the
record.

## What changes

- CnDetailPage `sideColumnOrder` (manifest `config.sideColumnOrder`): `board` (default) keeps today's order, `declared`
  keeps the order of `sideColumn`.
- CnTimelineWidget `content.limit` keeps the first that many events of the order.
- An audit-trail read is not a change, so the timeline widget leaves it out, as the manage view does by default.
