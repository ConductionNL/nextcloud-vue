## ADDED Requirements

### Requirement: A board card's subtitle sits as the boards draw it

In the board look a body card's subtitle SHALL be 14px at line height 1.2, 3px under the title, and the card's content
SHALL start 12px under the subtitle. Side cards SHALL keep their own spacing.

#### Scenario: tasks card
- **GIVEN** the case's "Taken op deze zaak" card with its subtitle
- **THEN** the subtitle starts 3px under the title and the table 12px under the subtitle
