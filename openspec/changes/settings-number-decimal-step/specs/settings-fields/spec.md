# settings-fields Delta: settings-number-decimal-step

## ADDED Requirements

### Requirement: A number setting steps as it is declared

A CnSettingsField number input SHALL take `step` from the field, else 1 when the field is `integer`, else `any`.

#### Scenario: Score threshold
- GIVEN a number field with max 1 and value 0.8
- THEN its input steps by any and 0.8 is valid
