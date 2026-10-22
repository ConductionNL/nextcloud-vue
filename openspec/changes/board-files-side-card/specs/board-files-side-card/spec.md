# board-files-side-card Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-files-side-card](../../)

## Purpose

A file's side card reads as the board's side card.

## ADDED Requirements

### Requirement: A board file side card is the board's side card

In the board look a CnFilesBrowser side card SHALL have radius `--cn-board-card-radius`, padding
`--cn-board-card-padding` and 10px between its parts. Its title SHALL be a `--cn-board-side-heading-size` heading at
600 in the muted text colour, and its facts SHALL be 8px 16px apart with the values at 500.

#### Scenario: DqDocumentenBeheer "Controlegetal"

- **GIVEN** a ticked file in the documents page in the board look
- **THEN** its "Controlegetal" card is titled as a side card, 15px at 600 in the muted colour
