# board-settings-textarea-leading Delta

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: A board settings text area sets its lines at 1.5

In the board look a text area on a settings card SHALL be 15px at line-height 1.5 with 8px 12px padding, so a
five-row area is 130.5px.

#### Scenario: dossiq's KCC settings

- **GIVEN** "Sentiment-triggerwoorden" with five rows in the board look
- **THEN** the area is about 130px high

### Requirement: A board settings text area leaves no line gap under it

In the board look a text area on a settings card SHALL be a block, so the field ends at the area and its hint
sits under it at the field's own spacing, with no descender gap of an inline box below the area.

#### Scenario: dossiq's KCC settings hint

- **GIVEN** "Sentiment-triggerwoorden" with its hint in the board look
- **THEN** the area's wrapper ends 2px under the area, not 9px
