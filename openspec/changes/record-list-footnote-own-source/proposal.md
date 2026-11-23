# Proposal: record-list-footnote-own-source

## Why

DqTenant's "Historie" side card lists the organisation's two newest events and ends with "Kenmerk TEN-0014", the
contract reference of its subscription. A record-list footnote can read a value, but only from the same answer its rows
come from (`footnote: { path, text }`); the audit trail does not hold the reference.

## What changes

- A record-list `footnote` object may carry its own `source` (`{ url, params?, responsePath? }`, the endpoint source
  shape) instead of `path`. The footnote then reads its value from that request and fills `{value}` into `text`, as a
  `path` footnote does. It shows with no rows too, and not when the value is empty.

## Scope

CnRecordListWidget.vue, its docs. No schema change.
