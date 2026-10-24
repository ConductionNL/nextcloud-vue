## ADDED Requirements

### Requirement: An archiving fact is a label over its value

The archiving card SHALL draw each fact as a label over its value, aligned to the card's start, whatever the server styles a definition list with. In the board look its section titles SHALL be 15px at weight 600.

#### Scenario: an open case's Archiving tab
- **GIVEN** a case that is not closed
- **WHEN** the Archiving tab shows Waardering, Bewaartermijn and Archiefactiedatum
- **THEN** each label SHALL start at the value's left edge, directly above it
