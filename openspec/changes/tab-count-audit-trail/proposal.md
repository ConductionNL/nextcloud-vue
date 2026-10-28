# Proposal: tab-count-audit-trail

## Why

Board PqJourney draws the History tab as "Geschiedenis 3": the journey's three changes. A tab counts a register list
(`countFrom: "widget"` or `{ register, schema }`) or an endpoint; the record's audit trail is neither, and counting its
raw endpoint counts every read of the record too (hundreds on a live page).

## What changes

- `countFrom: { auditTrail: true, excludeActions?, excludeActors? }` on a tab: the record's audit entries counted as the
  History card shows them, without the excluded actions and actors and without updates that changed nothing.
- `src/utils/auditEntries.js` (`keepAuditEntries`, `isEmptyUpdate`) holds that rule, read by both the card and the tab.

Without the key nothing changes. No schema change.
