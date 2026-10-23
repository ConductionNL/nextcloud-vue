# grouped-cards-item-menu Delta

## ADDED Requirements

### Requirement: A card's actions can sit in one menu

A grouped-cards widget with `itemActionsMenu: true` SHALL draw each card's actions in one icon-only menu named
"Actions for {card title}" instead of a row of buttons.

#### Scenario: A task on the phases card

- **GIVEN** the Fasen en taken card with item actions Edit task and Remove task and `itemActionsMenu: true`
- **THEN** the task "Volledigheid toetsen" shows one "···" button named "Acties voor Volledigheid toetsen" that opens both actions
