# cn-setup-wizard Delta: optional-step-requires

**Status**: in-progress
**Scope**: nextcloud-vue

## Purpose

Makes setup status agree with the wizard about steps it skips because a
required app is absent. Extends ADR-042 (first-time setup contract) and the
`requires` key from setup-wizard-card-load-and-dependency-gate.

## ADDED Requirements

### Requirement: A step whose required apps are absent is not applicable

A setup step MAY declare `requires: [appId, ...]`. While any listed app is not
installed and enabled, the step SHALL be not applicable everywhere the library
computes setup state. A not-applicable step SHALL be neither met nor unmet: it
SHALL NOT appear in `requiredUnmet`, `optionalUnmet` or `optionalUnmetReported`,
and it SHALL appear in `notApplicable`. This SHALL hold for a step marked
`required: true` as well.

App status SHALL be resolved the way `CnSetupWizard`'s dependency gate resolves
it: the `dependency_statuses` initial state first, then `useAppStatus`.

#### Scenario: An optional step with an absent app does not reopen the wizard

- **GIVEN** a manifest whose optional step `link-invoices` declares `requires: ["shillinq"]`
- **AND** shillinq is not installed
- **AND** the server reports `link-invoices` as `{ done: false }`
- **WHEN** `CnAppRoot` loads the setup status
- **THEN** `optionalUnmet` SHALL NOT contain `link-invoices`
- **AND** `CnAppRoot` SHALL NOT open the non-gating setup wizard

#### Scenario: A required step with an absent app does not gate the app

- **GIVEN** a manifest whose required step `link-ledger` declares `requires: ["shillinq"]`
- **AND** shillinq is not installed
- **WHEN** `CnAppRoot` loads the setup status
- **THEN** `requiredUnmet` SHALL NOT contain `link-ledger`
- **AND** `CnAppRoot` SHALL render the shell, not the setup gate
- **AND** `CnSetupWizard` SHALL neither offer the step nor wait for it

#### Scenario: The step counts again once the app is there

- **GIVEN** the same manifest
- **AND** shillinq is installed and enabled
- **WHEN** the setup status loads
- **THEN** an undone `link-invoices` SHALL be in `optionalUnmet`
- **AND** an undone `link-ledger` SHALL be in `requiredUnmet`

#### Scenario: The server's app status wins

- **GIVEN** the app injects `dependency_statuses` with shillinq installed but disabled
- **AND** the browser lists shillinq among the enabled apps
- **WHEN** the setup status loads
- **THEN** steps that require shillinq SHALL be not applicable
