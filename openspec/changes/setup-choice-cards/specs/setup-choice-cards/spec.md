# setup-choice-cards Delta: setup-choice-cards

**Status**: in-progress
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [setup-choice-cards](../../)

## Purpose

Lets a setup `choice` step explain itself: a grid of cards carrying each
option's description and counts, over a list of options the server owns.
Extends ADR-042 (first-time setup contract). Related: ADR-004 (component
rules), WCAG 2.2 AA.

## ADDED Requirements

### Requirement: A choice step renders as cards when it asks to

A `choice` step declaring `display: "cards"` SHALL render `CnChoiceCards`
instead of `NcSelect`. Any other value, and the absence of the key, SHALL
render the dropdown, so every step written before this change is unaffected.

The card grid SHALL show each option's `description` and `stats` when it has
them. Both renderers SHALL write the same `configKey` with the same values.

#### Scenario: Cards replace the dropdown

- **GIVEN** a `choice` step with `display: "cards"`
- **WHEN** the step renders
- **THEN** a card grid SHALL be shown
- **AND** each option's description SHALL be visible without opening anything

#### Scenario: A step that does not ask for cards is untouched

- **GIVEN** a `choice` step with no `display` key
- **WHEN** the step renders
- **THEN** `NcSelect` SHALL be shown

#### Scenario: Either renderer posts the same value

- **GIVEN** a `choice` step with `configKey: example_profile`
- **WHEN** an option is picked in either renderer and the step advances
- **THEN** `POST /api/setup/config` SHALL carry `{ example_profile: <value> }`

### Requirement: A choice step can read its options from the server

A `choice` step MAY declare `optionsSource`, naming a key in the app's own
`GET /apps/{appId}/api/setup/status` document. Dots in the name SHALL walk into
nested objects. The wizard SHALL render that list instead of `options[]`.

Entries SHALL be accepted in the shapes a server list arrives in: `id` SHALL be
read as `value` and `name` as `label`. A numeric `objectCount` greater than zero
SHALL become the stat a card shows; an `objectCount` of zero SHALL show no stat,
because "0 objects" is not a fact about a generated dataset, it is a missing
count.

The wizard SHALL NOT fetch setup status when no step declares `optionsSource`.

#### Scenario: The offered list is the server's list

- **GIVEN** a step with `optionsSource: "profiles"`
- **AND** status reporting three profiles
- **WHEN** the step renders
- **THEN** exactly those three options SHALL be offered

#### Scenario: A missing key offers nothing rather than failing

- **GIVEN** a step with `optionsSource: "profiles"`
- **AND** a status document with no `profiles` key
- **WHEN** the step renders
- **THEN** no option SHALL be offered
- **AND** the step SHALL still render

#### Scenario: A wizard with no live options makes no extra request

- **GIVEN** a wizard whose steps all declare their options statically
- **WHEN** it mounts
- **THEN** it SHALL NOT request `/api/setup/status`

### Requirement: Several options can be picked when the step allows it

A `choice` step declaring `multiple: true` SHALL let the operator select more
than one option, and SHALL persist the selection as an array under its
`configKey`.

#### Scenario: Two picks post as a list

- **GIVEN** a `multiple` choice step with cards
- **WHEN** two cards are picked and the step advances
- **THEN** `POST /api/setup/config` SHALL carry both values as an array

#### Scenario: Picking a selected card again removes it

- **GIVEN** a `multiple` choice step with one card selected
- **WHEN** that card is picked again
- **THEN** it SHALL no longer be selected

### Requirement: A card grid is operable without a mouse or colour vision

`CnChoiceCards` SHALL render each option as a `<label>` containing a native
`<input type="radio">`, or `type="checkbox"` when `multiple`. The input SHALL
remain visible, and SHALL NOT be the only thing conveying selection through
colour.

The group SHALL be a `<fieldset>` with a `<legend>` carrying the step title.
Option titles SHALL NOT render as headings.

Radio groups SHALL carry a `name` unique to the instance, so two grids on one
page do not share a selection.

#### Scenario: Keyboard reaches every option

- **GIVEN** a rendered card grid
- **WHEN** a keyboard user tabs into it
- **THEN** the native inputs SHALL take focus and the arrow keys SHALL move
  between radios

#### Scenario: The selection survives without colour

- **GIVEN** a selected card
- **WHEN** the page is rendered without the highlight colour
- **THEN** the checked input SHALL still show which option is selected

#### Scenario: Options are not headings

- **GIVEN** a grid of six options
- **WHEN** the document outline is read
- **THEN** none of the six option titles SHALL appear as a heading

### Requirement: The recap names the choice, not its identifier

The `summary` step SHALL show the selected option's label. When a card grid
stored plain values rather than option objects, the label SHALL be resolved
from the option list.

#### Scenario: The recap reads the label

- **GIVEN** a card grid where `municipality` is picked
- **WHEN** the summary step renders
- **THEN** it SHALL read "Municipality", not "municipality"

## MODIFIED Requirements

### Requirement: REQ-SETUP-NV-010 — CnSetupWizard Renders Built-In Step Types

`CnSetupWizard` SHALL wrap `CnWizardDialog` and render each `manifest.setup` step by
its `type`: `info` (note card), `config-fields` (`fieldsFromSchema` fields saved via
the app settings POST), `choice` (`NcSelect`, or `CnChoiceCards` when the step
declares `display: "cards"`, persisting to its `configKey`),
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

#### Scenario: A choice step renders in the shape it declares

- **GIVEN** two `choice` steps, one with `display: "cards"` and one without
- **WHEN** both render
- **THEN** the first SHALL show a card grid and the second a dropdown
