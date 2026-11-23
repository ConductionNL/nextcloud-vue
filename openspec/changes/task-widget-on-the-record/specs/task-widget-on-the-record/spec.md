# task-widget-on-the-record Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [task-widget-on-the-record](../../)

## ADDED Requirements

### Requirement: The first open task can be worked on in place

With `variant: "focus"` the widget SHALL show the first open task with its verbs and its form inline, and the
other open tasks under it; Complete SHALL name a required field left empty before posting, and SHALL post to
`completeUrl` when set.

#### Scenario: dossiq

- **GIVEN** a case with two open tasks, the first with a required field "verslag"
- **WHEN** the handler presses Complete with "verslag" empty
- **THEN** the widget says to fill in "verslag" and posts nothing

### Requirement: Claim follows a capability

With `claimCapabilityUrl` the widget SHALL offer Claim only when that URL answers `claim: true`, and SHALL offer
none when the read fails.

#### Scenario: dossiq

- **GIVEN** `claimCapabilityUrl` answering `{ "claim": false }`
- **THEN** a pooled task offers no Claim and says to assign it

### Requirement: A task form renders inline

CnTaskFormFields SHALL render a task form's declared fields in order, a disabled row with the reason for a field the
form cannot show, and the server's sentence for a form that cannot be rendered.

#### Scenario: dossiq

- **GIVEN** a form whose field "riskScore" is no longer on the schema
- **THEN** it shows as a disabled row with the server's reason
