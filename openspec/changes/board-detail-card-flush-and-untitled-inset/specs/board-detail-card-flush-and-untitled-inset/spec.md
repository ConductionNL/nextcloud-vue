# board-detail-card-flush-and-untitled-inset Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-detail-card-flush-and-untitled-inset](../../)

## Purpose

A CnDetailCard keeps its flush body and its untitled inset in the board look.

## ADDED Requirements

### Requirement: A flush board detail card has no inset

In the board look a CnDetailCard with `flush` SHALL render its content with no padding, so a list or table inside it
reaches the card's border.

#### Scenario: A flush card on a learniq custom page

- **GIVEN** a custom page in the board look with a flush CnDetailCard holding a list
- **THEN** the list's first row starts at the card's top border and runs to its side borders

### Requirement: An untitled board detail card takes the full inset

In the board look a CnDetailCard that renders no header and is not chromeless SHALL pad its content with
`--cn-board-card-padding`. A titled card keeps the 12px gap under its title.

#### Scenario: LqProctoring's untitled card

- **GIVEN** the proctoring review page in the board look
- **THEN** the first line of the untitled card starts 20px under the card's top border
