## ADDED Requirements

### Requirement: The actions column fits a row button

When file rows carry a row button, CnFilesBrowser SHALL size the actions column to the first row's actions cell, so the button and the row menu stay inside the table.

#### Scenario: documents under review
- GIVEN a review case whose rows carry "Beoordelen" beside the row menu
- THEN both stand inside the files card
