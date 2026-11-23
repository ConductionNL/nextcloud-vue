# Tasks: audit-card-exclusions-in-the-query

- [x] 1.1 Test (red first): `tests/components/CnAuditTrailCardServerExclusions.spec.js` (2 of 4 red: no notIn params).
- [x] 1.2 `CnAuditTrailCard.addExclusions` on the own trail URL and each related trail URL; the browser filter stays.
- [ ] 1.3 Live: DqSociaalDomein side Historie on :8080 after openregister audit-trail-not-in-filter and this land.
- [x] 1.4 `auditExclusionParams` (utils/auditEntries.js) used by the card, `CnTimelineWidget` and `CnTabsWidget` countAuditTrail (`tests/components/AuditExclusionsInTheQueryTimelineTabs.spec.js`, red first 3/3).
