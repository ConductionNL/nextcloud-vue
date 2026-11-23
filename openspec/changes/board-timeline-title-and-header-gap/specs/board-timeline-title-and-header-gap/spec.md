# board-timeline-title-and-header-gap Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-timeline-title-and-header-gap](../../)

## Purpose

A timeline card in the main column is titled as a board card, and its header buttons stand 8px apart.

## ADDED Requirements

### Requirement: A main-column timeline is titled as a board card

In the board look a CnTimelineWidget title outside the side column SHALL be `--cn-board-heading-size`, weight 700, at
line height `normal`.

#### Scenario: PqKlant "Activiteit"

- **GIVEN** a client page in the board look
- **THEN** the "Activiteit" title is 17px at 700

### Requirement: Tonal and link header buttons carry no margin

CnWidgetHeaderActionButtons SHALL draw its tonal and link buttons without margin, so two of them stand the row's 8px
gap apart.

#### Scenario: PqKlant "E-mail koppelen" and "Opstellen in Mail"

- **GIVEN** the Activiteit card with its two tonal header buttons
- **THEN** the buttons stand 8px apart
