# detail-page Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [side-column-from-keeps-its-order](../../)

## ADDED Requirements

### Requirement: A listed side column keeps its order in the board look

When `sideColumnFrom` yields a non-empty list of ids, the side column SHALL show those entries in the listed order in the board look too; the board ranking (a notice first, the History card last) SHALL apply only to the declared column.

#### Scenario: Melding Jeugdwet

- GIVEN a case whose case type lists `side-special-data-health, side-social-consent, side-social-people, side-social-history, case-banner-stack`
- WHEN the case page is shown in the board look
- THEN the History card stands above the Status card

#### Scenario: Nothing listed

- GIVEN a case type that lists no side cards
- WHEN the case page is shown in the board look
- THEN a notice stands first and the History card last
