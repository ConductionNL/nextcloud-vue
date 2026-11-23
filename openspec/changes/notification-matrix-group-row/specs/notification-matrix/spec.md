# notification-matrix Delta: notification-matrix-group-row

## ADDED Requirements

### Requirement: A board matrix group row is a compact label line

In the board look the group header cell SHALL have no padding, and the group button SHALL be a block with 14px padding above and 4px below, no side padding, and no minimum height or margin.

#### Scenario: Meldingen
- GIVEN the user settings dialog in the board look
- WHEN the notification matrix lists the groups "Lead" and "Ticket"
- THEN each group row is about 34px high, its name 13px/600 in the muted ink
- AND clicking the name still folds the group
