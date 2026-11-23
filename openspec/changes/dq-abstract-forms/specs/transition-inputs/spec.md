# transition-inputs Delta

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: An act's inputs are drawn in place from declarations

CnTransitionInputFields SHALL draw a declared input list wherever a host puts it, and CnTransitionInputDialog SHALL draw its inputs through it, so both decide completeness the same way (`readTransitionInputs`). An input SHALL be able to declare its widget (`text`, `textarea`, `number`, `date`, `select`, `template`), choices read off a context (`optionsSource`), an "Other" entry that falls back to a free-text input, a helper read off the picked choice (`helperFrom`), and a preview filled from the values. A hidden input SHALL be neither asked nor sent, and a picked Other SHALL be sent as ''.

#### Scenario: Pausing with declared reasons

- **GIVEN** a pause act whose reasons come from the context, with Other falling back to the reason text
- **WHEN** the context holds reasons
- **THEN** the picker is shown and must be picked, the reason text is hidden until Other is picked, and the days field shows the picked reason's legal basis
- **WHEN** the context holds none
- **THEN** the picker is hidden and the reason text alone is asked

#### Scenario: The day the case comes back

- **GIVEN** a days input with the preview `{today+days|date}`
- **THEN** the preview shows today plus the days once they are a positive whole number, and nothing otherwise

### Requirement: A template never writes over typed text

A `template` input SHALL put the chosen template's body into the input it names only while that input is empty.

#### Scenario: The handler already wrote two paragraphs

- **WHEN** a template is picked over typed text
- **THEN** the typed text stays
