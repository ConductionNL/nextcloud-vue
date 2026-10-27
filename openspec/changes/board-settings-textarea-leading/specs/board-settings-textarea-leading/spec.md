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
