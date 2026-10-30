# board-duplicate-warning-text Delta: board-duplicate-warning-text

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-duplicate-warning-text](../../)

## Purpose

The duplicate warning in a board dialog reads as the board draws it.

## ADDED Requirements

### Requirement: A board duplicate warning is drawn as the board

In a board dialog, CnDuplicateWarning's warning note SHALL be 12px 14px in at radius 8 on the status warning ground,
its line 15px bold on the normal line height in the warning ink. A match card SHALL stack its title and facts 3px apart,
12px 14px in, the title on the normal line height and the facts at 13px. The small print SHALL be 13px.

#### Scenario: DqNieuweZaakDubbel

- **WHEN** a handler files a case that matches an open one
- **THEN** the note reads "1 openstaande zaak lijkt op deze." in 15px bold on the warning ground at radius 8
- **AND** the match card is about 80px high with its two facts lines at 13px

#### Scenario: DqNieuweZaakDubbel spacing

- **GIVEN** the duplicate warning in a board dialog
- **THEN** the warning note, the matches and the reason field stand 14px apart
