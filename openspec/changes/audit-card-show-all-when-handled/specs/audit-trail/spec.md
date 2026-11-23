# audit-trail Delta

## ADDED Requirements

### Requirement: A history card offers show all only when its host handles it

`CnAuditTrailCard` SHALL draw its "Show all" footer only when it holds more entries than it shows AND its host listens
for `show-all`. Without a listener it SHALL draw no footer.

#### Scenario: A history card on a detail page

- **GIVEN** an audit-trail widget with `maxDisplay: 3` on a record with 6 entries
- **THEN** the card shows 3 rows and no "Show all" footer

#### Scenario: A host that opens the full history

- **GIVEN** a `CnAuditTrailCard` with a `show-all` listener, `maxDisplay: 3` and 6 entries
- **THEN** the card ends in "Show all (6)", and a click emits `show-all`
