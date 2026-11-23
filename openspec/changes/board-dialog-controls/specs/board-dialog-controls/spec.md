# board-dialog-controls Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-dialog-controls](../../)

## Purpose

A board dialog's header, footer and fields look as the dialog boards draw them.

## ADDED Requirements

### Requirement: A board dialog draws its controls as the boards do

In the board look a dialog's footer buttons SHALL be 16px in at both sides (18px with an icon) with 14px text; the
close button SHALL be a 36px circle; the subtitle SHALL be 14px in the muted text colour, also under a theme that sets
paragraphs with `!important`; the eyebrow SHALL use a text colour; a field SHALL have a 1px border and a plain input
SHALL be 40px tall; a single select SHALL keep its buttons inside its border. A two-column CnFormDialog SHALL default
to the 720px width. CnActionDialog's reason and CnAssignDialog's note SHALL take a `rows` height.

#### Scenario: DqOverdragen

- **GIVEN** the hand-over dialog in the board look
- **THEN** "Annuleren" is 16px in at 14px, "Overdragen" 18px in with its icon, the close button a 36px circle and the reason field three lines with a 1px border

#### Scenario: DqNieuweZaak

- **GIVEN** the two-column new case dialog in the board look
- **THEN** the dialog is 720px wide and each select's clear and open buttons sit inside its border
