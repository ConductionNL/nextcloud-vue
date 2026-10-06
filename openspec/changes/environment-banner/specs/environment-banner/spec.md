# Spec: Environment banner

## ADDED Requirements

### Requirement: A non-production environment is named on every app screen
`CnAppRoot` and `CnAdminSettingsShell` SHALL render `CnEnvironmentBanner` at
the top of the screen when the resolved environment is `development`, `test`
or `acceptance`. The banner SHALL show the environment's name in words, use a
colour per environment from CSS variables, carry `role="note"` with an
accessible name, and SHALL NOT offer a close action. The document title SHALL
be prefixed with `[DEV]`, `[TEST]` or `[ACC]` while the banner shows.
`production`, an unknown value or no value SHALL render nothing and leave the
title unchanged.

#### Scenario: an acceptance instance says so
@e2e exclude Library-level mount: tests/components/CnAppRootEnvironment.spec.js mounts CnAppRoot with an acceptance organisation
- **GIVEN** an app on `CnAppRoot` whose active organisation has `environment` `acceptance`
- **WHEN** any page renders
- **THEN** a banner reading "Acceptance environment" sits at the top with no close button, and the tab title starts with `[ACC]`

#### Scenario: production shows nothing
@e2e exclude Library-level mount: tests/components/CnAppRootEnvironment.spec.js
- **GIVEN** an active organisation with `environment` `production`
- **WHEN** the app renders
- **THEN** no banner exists in the DOM and the title has no prefix

#### Scenario: the admin settings say it too
@e2e exclude Library-level mount: tests/components/CnAdminSettingsShell.spec.js
- **GIVEN** an admin settings page on `CnAdminSettingsShell` in a test environment
- **WHEN** it renders
- **THEN** it shows the "Test environment" banner

### Requirement: The environment is resolved from the app, then the organisation, never guessed
The environment SHALL be the `environment` prop when it is one of
`development`, `test`, `acceptance` or `production`; else the active
organisation's `environment` from the tenant context; else none. A read of the
organisation that fails SHALL resolve to none and log one warning. The banner
SHALL follow a tenant switch.

#### Scenario: the app's own setting wins
@e2e exclude Library-level mount: tests/components/CnAppRootEnvironment.spec.js
- **GIVEN** `CnAppRoot` with `environment="acceptance"` and an organisation labelled `production`
- **WHEN** it renders
- **THEN** the acceptance banner shows

#### Scenario: switching organisation changes the label
@e2e exclude Library-level mount: tests/components/CnAppRootEnvironment.spec.js
- **GIVEN** a user in a `test` organisation who switches to a `production` organisation
- **WHEN** the tenant switch completes
- **THEN** the banner disappears and the title prefix is removed

#### Scenario: a failed organisation read shows nothing, not production
@e2e exclude Library-level mount: tests/components/CnAppRootEnvironment.spec.js
- **GIVEN** the organisation read rejects
- **WHEN** the app renders
- **THEN** no banner shows, the title is unchanged, and one warning is logged

### Requirement: An app without the shell can place the banner itself
`CnEnvironmentBanner` SHALL be exported from the library's main entry with
an `environment` prop, so an app that does not mount `CnAppRoot` can render
the same banner.

#### Scenario: an app places the banner
@e2e exclude Export contract: tests/components/CnEnvironmentBanner.spec.js
- **GIVEN** an app that imports `CnEnvironmentBanner` and passes `environment="development"`
- **WHEN** it renders
- **THEN** the "Development environment" banner shows
