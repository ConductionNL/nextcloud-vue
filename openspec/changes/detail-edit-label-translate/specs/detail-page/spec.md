# detail-page Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [detail-edit-label-translate](../../)

## Purpose

The detail header speaks the reader's language.

## ADDED Requirements

### Requirement: The edit button label follows the reader's language

CnDetailPage SHALL run a manifest `editLabel` through the host translate function.

#### Scenario: A Dutch reader

- **GIVEN** `editLabel: "Deviate with a reason"` and an app catalogue that translates it to "Afwijken met reden"
- **THEN** the header button reads "Afwijken met reden"
