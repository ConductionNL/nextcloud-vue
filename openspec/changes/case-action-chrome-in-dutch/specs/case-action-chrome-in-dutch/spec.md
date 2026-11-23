## ADDED Requirements

### Requirement: A Dutch reader meets the action chrome in Dutch

Every string `CnConfirmDialog`, `CnTransitionInputDialog`, `CnWriteConfirmDialog`, `CnActionButtons`, `CnBuildiqEditButton`, `CnDetailPage` and `actionsDispatcher` translate in the `nextcloud-vue` domain SHALL have a Dutch entry in `l10n/nl.json`.

#### Scenario: The confirm dialog asks in Dutch
- **GIVEN** a reader whose language is Dutch
- **WHEN** an action asks for confirmation with the default wording
- **THEN** the dialog SHALL read "Weet je zeker dat je wilt doorgaan?" with the button "Bevestigen"

@e2e exclude A catalogue entry; the unit test runs the real @nextcloud/l10n against the shipped nl.json and reads every key from the source.
