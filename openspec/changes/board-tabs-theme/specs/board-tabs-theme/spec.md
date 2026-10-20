# board-tabs-theme Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-tabs-theme](../../)

## Purpose

Folder tabs look as the boards draw them, also under a theme that styles buttons with `!important`.

## ADDED Requirements

### Requirement: Board folder tabs keep the board's weight, shape and height under a theme

In the board look a folder tab SHALL set the nldesign button weight token to 400 and its radius token to
8px 8px 0 0; the open tab SHALL set the weight token to 700. A tab SHALL be at least 37px tall with or without a count,
the open tab 38px.

#### Scenario: DqZaak "Zaakonderdelen" under the nldesign theme

- **GIVEN** a case detail page in the board look under the nldesign theme
- **THEN** "Overzicht", the open tab, draws bold and the other tabs at regular weight
- **AND** every tab has square bottom corners
- **AND** "Documenten", without a count, is as tall as "Contact", with one
