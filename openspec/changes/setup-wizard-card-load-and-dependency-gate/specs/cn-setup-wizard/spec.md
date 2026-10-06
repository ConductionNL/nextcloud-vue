# cn-setup-wizard Delta: setup-wizard-card-load-and-dependency-gate

**Status**: in-progress
**Scope**: nextcloud-vue

## Purpose

Lets a dataset card load itself, stops the wizard in front of a missing
required app, and gives the admin screen a block for one-click maintenance
actions. Extends ADR-042 (first-time setup contract).

## ADDED Requirements

### Requirement: A dataset card loads itself

A `choice` step with `display: "cards"` MAY declare `loadAction`, an action id.
When it does, every card whose value is not `none` SHALL show its own Load
button below the card. Clicking it SHALL `POST
/apps/{appId}/api/setup/action/{loadAction}` with body `{ dataset: <value> }`.
While the request runs, the button SHALL show a spinner and be disabled. When
it settles, the card SHALL show the server's message, styled as success or
error. A successful load SHALL also select that card.

A step without `loadAction` SHALL render exactly as before, and a following
`run-action` step SHALL keep working unchanged.

#### Scenario: Each dataset card has its own Load button

- **GIVEN** a cards choice step with `loadAction: "load-demo-data"` and options `none` and `demo`
- **WHEN** the step renders
- **THEN** the `demo` card SHALL show a Load button
- **AND** the `none` card SHALL NOT show one

#### Scenario: Loading posts the dataset and shows the result on the card

- **GIVEN** the same step
- **WHEN** the user clicks Load on the `demo` card
- **THEN** the wizard SHALL `POST /apps/{appId}/api/setup/action/load-demo-data` with `{ dataset: "demo" }`
- **AND** the button SHALL show a spinner until the request settles
- **AND** the server's message SHALL appear on the `demo` card

#### Scenario: Picking None still records the choice

- **GIVEN** the same step
- **WHEN** the user picks `none` and clicks Next
- **THEN** the wizard SHALL `POST /api/setup/config` with the step's `configKey` set to `none`
- **AND** SHALL NOT post the load action

### Requirement: The wizard checks dependencies before any step

`CnSetupWizard` SHALL resolve the app's dependencies (its `dependencies` prop,
or the injected manifest's `dependencies`) before it shows a step. While a
required dependency is missing or disabled, the wizard SHALL show the list of
dependencies, with install and enable actions for an admin, instead of the
steps. Next SHALL be disabled and no step action SHALL run.

A missing optional dependency SHALL NOT block. The first step SHALL list it as
optional and not installed.

A step MAY declare `requires: [appId, ...]`. When any listed app is absent,
the wizard SHALL skip that step and the summary SHALL show it as skipped,
naming the missing apps. Apps SHOULD NOT mark such a step `required`.

#### Scenario: A missing required app replaces the steps

- **GIVEN** a manifest with dependency `openregister` (required) that is not installed
- **WHEN** the wizard opens
- **THEN** it SHALL show `openregister` as missing
- **AND** SHALL NOT show any setup step
- **AND** Next SHALL be disabled

#### Scenario: A missing optional app does not block

- **GIVEN** a dependency `{ id: "forms", required: false }` that is not installed
- **WHEN** the wizard opens
- **THEN** it SHALL show the setup steps
- **AND** the first step SHALL list Forms as optional and not installed

#### Scenario: A step that needs an absent app is skipped

- **GIVEN** a step with `requires: ["shillinq"]` and shillinq is not installed
- **WHEN** the wizard opens
- **THEN** the step SHALL NOT be offered
- **AND** the summary SHALL show it as skipped because shillinq is missing

### Requirement: An admin action card runs one server action

The library SHALL export `CnAdminActionCard`: a card with a title, an
explanation and one button. Clicking the button SHALL `POST` the configured
app action, show a spinner while it runs, and then show the result message as
success or error. It SHALL emit `result` with `{ success, message, data }`.
Provisioning actions such as register repair SHALL live in this card on the
admin screen, never in the setup wizard.

#### Scenario: The admin repairs the register from the admin screen

- **GIVEN** a `CnAdminActionCard` with `appId: "pipelinq"` and `action: "provision"`
- **WHEN** the admin clicks its button
- **THEN** it SHALL `POST /apps/pipelinq/api/setup/action/provision`
- **AND** SHALL show a spinner until the request settles
- **AND** SHALL show the server's message
