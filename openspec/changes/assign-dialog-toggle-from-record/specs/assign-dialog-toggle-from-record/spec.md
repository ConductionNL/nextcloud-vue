# assign-dialog-toggle-from-record Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [assign-dialog-toggle-from-record](../../)

## Purpose

An assign dialog's switches can speak about the record in hand.

## ADDED Requirements

### Requirement: An assign dialog toggle is filled from the record

CnAssignDialog SHALL translate a toggle's `label` and `note` and then fill their `{field}` placeholders from the record
it read, as it does for the eyebrow.

#### Scenario: DqOverdragen

- **GIVEN** a handover dialog whose doorzending toggle note is "{initiatorDisplayName} then gets a message that the case moves."
- **THEN** on the case of Sanne de Vries the note reads "Sanne de Vries then gets a message that the case moves."
