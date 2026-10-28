# board-search-select-list Delta: board-search-select-list

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-search-select-list](../../)

## Purpose

A search select's open list in the board look is drawn as the boards draw it.

## ADDED Requirements

### Requirement: A board search select's open list is a card under the field

In the board look, the open list of a CnSearchSelect SHALL sit 4px under the field with a 1px hairline on every side,
radius 8 and a soft shadow. Its highlighted row SHALL sit on the light primary ground with a white lead; other leads
SHALL sit on the grey ground in the soft ink. A row with initials SHALL be 8px 10px in with a 28px chip in 12px bold
and a 14px name over a 12px line; a row with an icon SHALL be 10px 12px in with 12px between icon and text. The open
search field SHALL have a 2px edge in the primary colour.

#### Scenario: DqNieuweZaak requester

- **WHEN** a handler types "Visser" in Aanvrager
- **THEN** the list is a card 4px under the field, Henk Visser's row on the light primary ground with a white 28px chip, rows 47px high

#### Scenario: DqOverdragen team

- **WHEN** a handler types "juri" in Nieuw team
- **THEN** the team rows are 10px 12px in and about 53px high, and the field has a 2px primary edge

#### Scenario: Nextcloud look

- **WHEN** the app or page keeps the Nextcloud look
- **THEN** the list is NcSelect's own
