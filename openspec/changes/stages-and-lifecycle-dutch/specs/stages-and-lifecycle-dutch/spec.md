## ADDED Requirements

### Requirement: A Dutch reader meets the stages and lifecycle strings in Dutch

Every string `CnStagesWidget` and `CnLifecycleActions` translate in the `nextcloud-vue` domain SHALL have a Dutch entry in `l10n/nl.json`.

#### Scenario: The toast after a move reads Dutch
- **GIVEN** a reader whose language is Dutch
- **WHEN** a lifecycle move to "Beoordeling" succeeds
- **THEN** the toast SHALL read "Verplaatst naar Beoordeling"

@e2e exclude A catalogue entry; the unit test runs the real @nextcloud/l10n against the shipped nl.json and reads every key from the component source.
