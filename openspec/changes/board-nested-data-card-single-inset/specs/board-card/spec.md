## ADDED Requirements

### Requirement: A bare data grid is inset once
In the board look, a data grid rendered bare inside a section or a tab panel MUST take no padding of its own; the card around it provides the inset.

#### Scenario: Data grid in a section of a sections card
- GIVEN a sections card whose section holds a data widget
- WHEN the detail page renders in the board look
- THEN the first label starts at the card's own inline padding, 23px from the card edge

### Requirement: A sections card that opens on a data grid starts it 14px under the title
In the board look, a sections card whose first section has no heading and holds a data grid MUST start the grid 14px under the card title, as a data card does.

#### Scenario: Billing card of a contract
- GIVEN a sections card whose first section is a data widget without a section heading
- WHEN the detail page renders in the board look
- THEN the first label sits 14px under the card title
