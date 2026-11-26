# action-buttons

## ADDED Requirements

### Requirement: A header action's remote conditions are read once per record

`CnActionButtons` SHALL ask each endpoint or source that its actions' `visibleWhen` and `disabledWhen` name at most once per record. A new object context that carries the same record, the same record with only its lock changed, or the same record with new visibility rows SHALL reuse the earlier answer. A change of the record's own data, of the action list, or a click on any action of the bar SHALL ask again. A read that was refused or failed SHALL NOT be reused. A caller of `evaluateVisibleWhen()` that passes no `remoteReads` map SHALL fetch on every call, as before.

#### Scenario: The page refreshes its context while an edit takes the lock
<!-- @e2e exclude library behaviour without UI of its own; proven by tests/components/CnActionButtonsRemoteReadsOncePerRecord.spec.js "asks the endpoint once while the page refreshes the same record and takes its lock". -->
- **GIVEN** a detail page whose header action shows while `/api/case/{id}/lifecycle` says `suspended: false`
- **WHEN** the page replaces its object context with its visibility rows, and again with the record locked for an edit
- **THEN** the endpoint is asked once
- **AND** the action stays shown

#### Scenario: The record changed
<!-- @e2e exclude library behaviour; proven by the same spec file "asks again when the record itself changed". -->
- **GIVEN** the same page
- **WHEN** the record is saved and re-read with a changed field
- **THEN** the endpoint is asked again

#### Scenario: An action ran
<!-- @e2e exclude library behaviour; proven by the same spec file "asks again after an action ran". -->
- **GIVEN** the same page
- **WHEN** a handler clicks any action of the bar and the page re-reads the record unchanged
- **THEN** the endpoint is asked again
