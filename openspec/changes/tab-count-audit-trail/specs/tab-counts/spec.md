# tab-counts Delta: tab-count-audit-trail

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [tab-count-audit-trail](../../)

## Purpose

A History tab says how many changes the record has.

## ADDED Requirements

### Requirement: A history tab can count the record's changes

A tab with `countFrom: { auditTrail: true, excludeActions?, excludeActors? }` SHALL show the number of the record's audit
entries the History card would show: without the excluded actions and actors and without updates that changed nothing.
When the trail cannot be read the tab SHALL show no number.

#### Scenario: Board PqJourney

- **GIVEN** a journey whose trail holds a create, two reads and two updates that changed a field
- **WHEN** its History tab counts with `excludeActions: ["read"]`
- **THEN** the tab reads "History 3"
