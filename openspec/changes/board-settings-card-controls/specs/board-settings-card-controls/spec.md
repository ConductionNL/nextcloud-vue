# board-settings-card-controls Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-settings-card-controls](../../)

## Purpose

An admin settings card's form controls have the size the boards draw.

## ADDED Requirements

### Requirement: A board settings card's fields and save buttons are 40px

In the board look a text field in a `.settings-section` SHALL be `--cn-field-height` tall with its wrapper that height
plus twice the focus ring, and the buttons in `.cn-settings-section__save` and in the board version card's footer row
SHALL be `--cn-field-height` tall with 14px text. The title of a settings card holding a compact version card SHALL be
18px.

#### Scenario: General tab

- **GIVEN** dossiq's admin General tab in the board look
- **THEN** "Naam van de organisatie" is a 40px field, "Opslaan" and "Configuratie opnieuw importeren" are 40px buttons
  with 14px labels, and "Versie-informatie" is 18px, as on board DqInstellingenAlgemeen
