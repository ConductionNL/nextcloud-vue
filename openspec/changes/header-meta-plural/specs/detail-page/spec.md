# detail-page Delta: header-meta-plural

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [header-meta-plural](../../)

## ADDED Requirements

### Requirement: A header line can name a count in the singular or the plural

A detail page's `headerMeta` MAY be `{ count, one, other, zero? }`. The page SHALL read the `headerMetaCounts` total
named by `count`, and SHALL show the `one` form for 1, the `zero` form for 0 when one is given, and the `other` form
otherwise, each translated on its own and filled as a string `headerMeta` is. While that total is missing the line
SHALL be left out.

#### Scenario: DqOrganisatie

- **GIVEN** `headerMeta: { count: "open", one: "{count:open} open case", other: "{count:open} open cases", zero: "" }`
- **THEN** an organisation with one open case reads "1 lopende zaak", with two "2 lopende zaken", and with none no line
