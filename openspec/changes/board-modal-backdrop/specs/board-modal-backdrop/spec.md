# board-modal-backdrop Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-modal-backdrop](../../)

## Purpose

Every dialog in a board-look app dims the page the same way.

## ADDED Requirements

### Requirement: Every modal in a board app dims the page as the boards do

While the page holds the board look and no Nextcloud-look page, every modal backdrop SHALL be the text colour at 45%,
whether the dialog was opened through CnDialog or as an app's own NcDialog or NcModal.

#### Scenario: DqInstellen

- **GIVEN** the "Voorbeeldgegevens" dialog of a board-look app, opened as an NcDialog
- **THEN** the page behind it reads rgb(146, 148, 149) on the #f5f6f8 ground, not rgb(122, 123, 124)
