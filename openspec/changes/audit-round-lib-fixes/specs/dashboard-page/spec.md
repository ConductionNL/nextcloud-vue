# dashboard-page: the install placeholder fits a small tile

## MODIFIED Requirements

### Requirement: REQ-DP-AUD-001 The requires-app placeholder fits its tile

The placeholder for a widget whose app is missing SHALL be two lines of text and the
install button, centred so its top stays in view, and SHALL scroll rather than clip
when the tile is smaller still.

#### Scenario: Shillinq is not installed

- **GIVEN** a two-row widget that requires shillinq, which is not installed
- **WHEN** the dashboard renders
- **THEN** the text and the "Install shillinq" button SHALL be fully visible
