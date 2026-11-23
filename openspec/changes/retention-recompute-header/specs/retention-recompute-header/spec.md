# retention-recompute-header Delta

## ADDED Requirements

### Requirement: Recomputing the nomination starts in the card header and asks for a reason

The retention widget SHALL offer "Recompute nomination" at the end of its card header. Clicking it SHALL open a dialog
that asks for the reason, which is required; confirming SHALL post the recompute with that reason and read the record
back. Without the archivist role the button SHALL be disabled and say why.

#### Scenario: DqZaakArchivering

- **GIVEN** an archivist on a case's Archivering tab
- **WHEN** they click "Nominatie herberekenen", type a reason and confirm
- **THEN** OpenRegister recomputes the nomination with that reason and the card shows the new facts
