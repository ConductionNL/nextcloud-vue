# files-card-header-actions

## ADDED Requirements

### Requirement: A files card carries header actions

CnFilesCard SHALL render the content of its `actions` slot in the card header,
and the slot's `refresh` MUST read the object's files again.

#### Scenario: Add attachment in the header

- **GIVEN** a CnFilesCard with an "Add attachment" button in its `actions` slot
- **WHEN** the card renders
- **THEN** the button is in the card header
- **AND** calling the slot's `refresh` requests the files again
