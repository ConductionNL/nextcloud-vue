# audit-trail Delta

## ADDED Requirements

### Requirement: A history card can leave out entries by actor

A history card MAY name actors to leave out (`excludeActors`, user ids, case-insensitive). The card SHALL NOT show their
entries, and SHALL read more entries than it shows so that the remaining entries fill the card.

#### Scenario: DqSociaalDomein Historie

- **GIVEN** a case whose newest trail entries are System updates of derived fields
- **AND** the history card with `excludeActors: ["System"]`
- **THEN** the card shows the people's entries
