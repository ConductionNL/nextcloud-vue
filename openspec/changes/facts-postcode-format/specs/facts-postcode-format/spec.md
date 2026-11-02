# facts-postcode-format Delta

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: A facts part can write a Dutch postcode with its space

A facts entry or part with `format: "postcode"` SHALL write a Dutch postcode (four digits, the first not 0, then two letters, with or without a space) as the four digits, one space and the two letters in capitals. Any other value SHALL be written as it is, and an empty value as nothing. The built-in formatter `postcode` SHALL do the same in tables.

#### Scenario: DqContact Woonadres
- **GIVEN** a contact whose residence postcode is stored as "2999AA" in Zuiddrecht
- **WHEN** the address part reads it with `format: "postcode"`
- **THEN** the card writes "2999 AA Zuiddrecht"

#### Scenario: Not a Dutch postcode
- **GIVEN** a postcode "B-1000"
- **THEN** it is written as "B-1000"
