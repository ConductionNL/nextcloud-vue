## ADDED Requirements

### Requirement: A data widget can keep its columns in the board look

A data widget with `fixedColumns: true` and `columns` greater than 1 MUST lay out its facts in exactly that many columns in the board look. Without `fixedColumns`, it MUST fit 200px columns as before.

#### Scenario: The lead's Deal card
- GIVEN the Deal card with `columns: 2, fixedColumns: true`
- THEN its facts stand in two columns at any card width
