# audit-trail Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [audit-trail-exclude-actions](../../)

## Purpose

A history card shows the events it is about.

## ADDED Requirements

### Requirement: A history card can leave out events by action

With `excludeActions` the audit trail card SHALL leave out entries whose action matches one of them, case-insensitive,
from its rows, its empty state and its "Show all" count, and SHALL read more entries than it shows so the excluded ones
do not crowd the rest out.

#### Scenario: DqZaaktype

- **GIVEN** the case-type history card with `excludeActions: ["read"]`
- **AND** a trail of reads, an update and a create
- **THEN** the card lists the update and the create only
