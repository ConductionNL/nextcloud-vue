# audit-trail Delta

## ADDED Requirements

### Requirement: A history card can leave out entries by actor

A history card MAY name actors to leave out (`excludeActors`, user ids, case-insensitive). The card SHALL NOT show their
entries, and SHALL read more entries than it shows so that the remaining entries fill the card.

#### Scenario: DqSociaalDomein Historie

- **GIVEN** a case whose newest trail entries are System updates of derived fields
- **AND** the history card with `excludeActors: ["System"]`
- **THEN** the card shows the people's entries

### Requirement: A label can quote a nested recorded value

An action label's `{changed.<key>}` SHALL read a dotted key into the value the entry recorded, such as
`{changed.data.fileName}` on a file action.

#### Scenario: A medical report was viewed

- **GIVEN** a `file.downloaded` entry whose recorded data names "Medisch verslag.pdf"
- **AND** the label `Viewed {changed.data.fileName}`
- **THEN** the row reads "Viewed Medisch verslag.pdf"
