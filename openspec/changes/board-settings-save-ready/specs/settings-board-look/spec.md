# settings-board-look Delta: board-settings-save-ready

## ADDED Requirements

### Requirement: A board settings card's Save is ready to press

In the board look CnSettingsFieldsSection's Save SHALL be disabled only while saving; with nothing changed a save SHALL send no request.

#### Scenario: Pristine card
- THEN "Opslaan" reads as the primary button, and pressing it sends nothing
