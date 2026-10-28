---
kind: code
---

# Proposal: audit-card-exclusions-in-the-query

## Summary

Board DqSociaalDomein's side Historie draws "Inzage medisch verslag · Fatma Kaya" and "Toestemming vastgelegd · Fatma
Kaya". Both rows are on :8080 and neither shows:

- the case e0b306d2 has 2,538 `read` rows and 67 System updates over its one `file.downloaded` row, and the card
  leaves reads and System out only after it has read at most five pages of 100;
- the consent's trail, read through `relatedSources`, holds 140+ System rows, so its first 100 entries are all ones
  the card hides and the `create` row is never read.

## What changes

When the card leaves actions or actors out, it asks the trail to leave them out as well: `action[notIn]=<actions>` and
`user[notIn]=<actors>` on the object's own trail and on each related record's trail. The page it reads then holds what
it shows. `keepAuditEntries` still filters what comes back, so an older trail that ignores the filter shows nothing it
should not.

## Dependency

Needs openregister `audit-trail-not-in-filter` (fix/audit-trail-not-in-filter). An OpenRegister without it casts the
array to "Array" and answers an empty trail, so this lands AFTER it.

## Scope

`src/components/CnAuditTrailCard/CnAuditTrailCard.vue` (and so `CnAuditTrailWidget`, which wraps it), and the same
parameters from `CnTimelineWidget` (audit read) and `CnTabsWidget` (`countFrom.auditTrail`), through one helper,
`auditExclusionParams` in `src/utils/auditEntries.js`. The app-wide
readable feed is unchanged.
