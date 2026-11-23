# cn-setup-wizard: a closed wizard is recorded on the server

## ADDED Requirements

### Requirement: REQ-SETUP-CLOSE-001 A closed setup wizard is recorded on the server

When the manifest declares `setup.dismissAction`, `CnAppRoot` SHALL post
`/apps/{appId}/api/setup/action/{dismissAction}` with `{ finished }` once when the user
closes or finishes the setup wizard, and SHALL emit `setup-wizard-dismissed`. A failed
post SHALL NOT keep the wizard open. Without the key, nothing SHALL be posted and the
close SHALL be remembered in the browser as before.

#### Scenario: Closed in one browser, closed in another

- **GIVEN** an app with `setup.dismissAction: "dismiss-setup"` and an unanswered optional step
- **WHEN** the administrator closes the wizard, and the app's status then reports `dismissed: true`
- **THEN** the wizard SHALL NOT open by itself in another browser

#### Scenario: A version bump asks again

- **GIVEN** the status reports `dismissed: 1`
- **WHEN** the manifest's `setup.version` is 2
- **THEN** the wizard SHALL open by itself again

### Requirement: REQ-SETUP-CLOSE-002 A config-fields step draws its intro

A `config-fields` step with a `body` SHALL draw it as an info note above its fields, the
same way choice and run-action steps do.

#### Scenario: The organisation step

- **GIVEN** a config-fields step with the body "Your organisation details…"
- **WHEN** the wizard shows that step
- **THEN** the body SHALL be visible above the fields
