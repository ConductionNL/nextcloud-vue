# transition-inputs Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [input-prefill-from](../../)

## ADDED Requirements

### Requirement: A pick can fill another input

A transition input with `prefillFrom: { input, key }` SHALL be set to the `key` of the row picked in that other input,
in the same update as the pick. A row without the key, the Other entry, and a pick in an input nobody fills from SHALL
leave its value as it was.

#### Scenario: Opschorten

- **GIVEN** the pause reason "Waiting for consent" carries 28 default days
- **WHEN** the handler picks it
- **THEN** "Days the applicant is given" reads 28, and picking a reason without a default leaves it as it was
