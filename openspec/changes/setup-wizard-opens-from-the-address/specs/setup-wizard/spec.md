# setup-wizard Delta: setup-wizard-opens-from-the-address

**Status**: in-progress
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: The address can open the setup wizard

CnAppRoot SHALL open the setup wizard when the current route's query has
`setup=open` and the manifest declares setup steps, also when the wizard was
finished or dismissed before. Without that query, or for an app without setup
steps, nothing SHALL change.

#### Scenario: A finished setup opens again from the address

- **GIVEN** an app whose setup steps are all done
- **WHEN** the route's query is `setup=open`
- **THEN** the cancellable setup wizard is open

#### Scenario: An app without setup steps ignores the query

- **GIVEN** an app whose manifest has no setup steps
- **WHEN** the route's query is `setup=open`
- **THEN** no setup wizard opens
