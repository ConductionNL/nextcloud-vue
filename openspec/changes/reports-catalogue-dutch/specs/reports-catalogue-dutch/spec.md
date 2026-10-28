## ADDED Requirements

### Requirement: The reports catalogue reads Dutch for a Dutch reader

Every string `CnReportsPage` translates in the `nextcloud-vue` domain SHALL have a Dutch entry in `l10n/nl.json`.

#### Scenario: The category filter offers all categories in Dutch
- **GIVEN** a reader whose language is Dutch
- **WHEN** the reports catalogue shows its category filter without an `allCategoriesLabel`
- **THEN** the filter's first option SHALL read "Alle categorieën"

@e2e exclude A catalogue entry; the unit test runs the real @nextcloud/l10n against the shipped nl.json and reads every key from the source.
