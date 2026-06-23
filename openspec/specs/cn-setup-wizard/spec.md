# cn-setup-wizard Specification

## Purpose
TBD - created by archiving change cn-setup-wizard. Update Purpose after archive.
## Requirements
### Requirement: REQ-SETUP-NV-010 — CnSetupWizard Renders Built-In Step Types

`CnSetupWizard` SHALL wrap `CnWizardDialog` and render each `manifest.setup` step by
its `type`: `info` (note card), `config-fields` (`fieldsFromSchema` fields saved via
the app settings POST), `choice` (`NcSelect` persisting to its `configKey`),
`run-action` (POST `/apps/{appId}/api/setup/action/{action}` then show success/error),
`summary` (recap + optional health card), and `component` (app-registered component
or `#step-<id>` slot). It SHALL NOT write OpenRegister objects directly.

#### Scenario: A run-action step calls the server, never the object API

- **GIVEN** a `run-action` step with `action: seed`
- **WHEN** the user runs it
- **THEN** `CnSetupWizard` SHALL `POST /apps/{appId}/api/setup/action/seed`
- **AND** SHALL display the returned success/error result
- **AND** SHALL NOT call `/apps/openregister/api/objects` from the browser

#### Scenario: A config-fields step reuses the admin settings fields

- **GIVEN** a `config-fields` step with a JSON Schema
- **WHEN** rendered
- **THEN** it SHALL build inputs via `fieldsFromSchema` (the same field components the admin pages use)
- **AND** "Save & continue" SHALL persist via the app settings endpoint before advancing

### Requirement: REQ-SETUP-NV-011 — useSetupStatus Reports Required/Optional Unmet

`useSetupStatus(appId, manifest)` SHALL fetch `GET /apps/{appId}/api/setup/status`,
cross-reference `manifest.setup.steps[].required`, and return
`{ steps, requiredUnmet, optionalUnmet, completed, loading, refresh }`, with
`completed` honouring `manifest.setup.version` vs the returned `version`.

#### Scenario: Required-unmet is derived from status + manifest

- **GIVEN** status reports a required step `done:false`
- **WHEN** `useSetupStatus` resolves
- **THEN** that step SHALL appear in `requiredUnmet` and `completed` SHALL be false

### Requirement: REQ-SETUP-NV-012 — CnAppRoot Gates On Required-Unmet

`CnAppRoot` SHALL add a `setup` phase after the dependency-check phase: when
`manifest.setup.enabled` and `requiredUnmet.length > 0`, it SHALL render
`CnSetupWizard` in place of the shell (overridable via a `#setup` slot); when only
`optionalUnmet`, it SHALL render the shell and auto-open the wizard once
(dismissible).

#### Scenario: Required-unmet gates the shell

- **GIVEN** an app whose manifest has a required setup step that is unmet
- **WHEN** `CnAppRoot` boots past dependency-check
- **THEN** it SHALL show `CnSetupWizard` and SHALL NOT render the app shell/navigation

#### Scenario: Optional-only does not gate

- **GIVEN** all required steps are met but an optional step is unmet
- **WHEN** `CnAppRoot` boots
- **THEN** it SHALL render the shell
- **AND** SHALL auto-open the wizard once (dismissible, re-openable from the admin page)

### Requirement: REQ-SETUP-NV-013 — Both Modals Are Reachable From The Admin Page

`CnAdminSettingsShell` SHALL provide `showSetup` and `showHelp` actions that open
`CnSetupWizard` and `CnSuggestFeatureModal` respectively, so both are reachable from
the admin settings page (not the personal settings page).

#### Scenario: Admin opens setup and help from the admin page

- **GIVEN** an admin on the app's admin settings page
- **WHEN** they click "Run setup wizard" / "Help us"
- **THEN** `CnSetupWizard` / `CnSuggestFeatureModal` SHALL open from that page

