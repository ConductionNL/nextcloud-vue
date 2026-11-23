# board-tab-panel-padding Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-tab-panel-padding](../../)

## Purpose

The panel under a board tab strip is padded as the card it is.

## ADDED Requirements

### Requirement: A board tab panel is padded as a card

In the board look a CnTabsWidget panel that holds one widget SHALL take the board card padding (20px 22px), and a
list's footer Add in it SHALL bleed that padding. A panel that holds a stack SHALL stay unpadded.

#### Scenario: DqZaakHistorie

- **GIVEN** a dossiq case in the board look, on its History tab
- **THEN** the title "Historie van de zaak" sits 23px in from the panel's left edge and 21px from its top

#### Scenario: Nextcloud look

- **GIVEN** an app without `look: "board"`
- **THEN** its tab panels keep 12px padding
