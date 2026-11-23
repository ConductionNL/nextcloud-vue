# checklist-widget Delta

## ADDED Requirements

### Requirement: A board checklist sits at the card inset

In the board look a checklist item's box SHALL start at the card's content inset, its label SHALL follow 10px after the
box in weight 600, and items SHALL be 12px apart.

#### Scenario: DqTaak

- **GIVEN** the task "Hoorzitting inplannen" with four checklist items
- **THEN** the first box starts 23px into the card and the items are 32px apart
