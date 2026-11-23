# record-notes-outcome-below Delta

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: A notes field can put its outcome under the save status

With `outcomeBelow: true` the record-notes widget SHALL draw the outcome select and its button on their own line under the save status, at the start, 10px apart. Without it the status and the outcome SHALL share one line as before.

#### Scenario: PqContactmoment Gespreksnotities

- **GIVEN** the conversation notes with `outcomeBelow: true`
- **THEN** "Uitkomst: kies" and "Uitkomst noteren" stand under "Wordt automatisch opgeslagen terwijl je typt.", at the left edge of the field
