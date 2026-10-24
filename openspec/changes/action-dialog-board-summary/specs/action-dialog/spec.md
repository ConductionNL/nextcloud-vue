## ADDED Requirements

### Requirement: The action dialog's summary and facts read as the board

The action dialog SHALL draw the record's icon on a tinted tile, its facts as label over value without cell padding, and a note with the icon its config names.

#### Scenario: archiving a case
- **GIVEN** the archive dialog with `note.icon` LockOutline
- **WHEN** it opens on a case
- **THEN** the case's folder icon SHALL stand on a 36px tile
- **AND** the retention facts SHALL have their labels flush over their values
- **AND** the note SHALL show a lock
