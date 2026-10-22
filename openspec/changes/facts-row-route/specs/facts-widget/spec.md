# facts-widget Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [facts-row-route](../../)

## ADDED Requirements

### Requirement: A facts row can link its value to a route

A facts `row` with `route` SHALL draw its value as a link to that route, with `@source.<path>` in its params read from the
record shown. When a param does not fill, the value SHALL stay plain text.

#### Scenario: DqZaaktypeVelden

- **GIVEN** the row "Erft van" with `route: { name: "CaseTypeDetail", params: { id: "@source.caseType.parentCaseType" } }`
- **THEN** the parent's name links to the parent case type's page
