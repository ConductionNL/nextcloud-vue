# board-notice-warning-tint Delta

## ADDED Requirements

### Requirement: The board notice sits on the warning tint

The board notice SHALL take the theme's warning tint `--nl-color-orange-light` as its ground, and #fff4de when the
theme sets none.

#### Scenario: Advies gevraagd

- **GIVEN** a Dq case under the Zuiddrecht set
- **THEN** the "Advies gevraagd" notice is #FFF4DE, as the boards draw it

### Requirement: A record list's warning notice sits on the warning tint

Under the board look a record list's warning notice SHALL take `--nl-color-orange-light` as its ground, and #fff4de
when the theme sets none.

#### Scenario: Controle on a case type

- **GIVEN** DqZaaktypeOverzicht's "Controle" card with a warning
- **THEN** the notice is #FFF4DE, not rgba(255, 196, 0, 0.12)
