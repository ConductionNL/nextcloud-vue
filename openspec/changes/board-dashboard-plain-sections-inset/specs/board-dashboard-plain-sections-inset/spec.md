# board-dashboard-plain-sections-inset Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-dashboard-plain-sections-inset](../../)

## Purpose

A dashboard card's text keeps the card's inset when its body is a plain sections widget.

## ADDED Requirements

### Requirement: A board dashboard card insets a plain sections body

In the board look a dashboard card whose content is a plain sections widget (`cn-sections-widget--plain`) SHALL pad
that content `0 var(--cn-board-dashboard-card-inset) 20px`.

#### Scenario: DqTermijnen "Jaarlijkse dwangsomaudit"

- **GIVEN** the deadline dashboard in the board look
- **THEN** the card's first line starts at the same inset as its title
