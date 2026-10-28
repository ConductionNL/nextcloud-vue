# stages-widget Delta: stages-declared-list

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [stages-declared-list](../../)

## Purpose

A fixed process can be listed in the manifest and drawn as a list of rows.

## ADDED Requirements

### Requirement: Stages can be declared in the manifest

The stages widget SHALL read `content.stages` (`[{ id, label, hint?, final? }]`) as its stage list, labels and hints
through the host translate, without reading an endpoint or a source. A declared list SHALL win over `stagesEndpoint` and
`stagesSource`.

#### Scenario: A quote's stages

- **GIVEN** the stages Draft, Sent, Accepted, Rejected and Expired declared on a quote page
- **WHEN** a draft quote is shown
- **THEN** the widget draws those five stages and reads no stage list

### Requirement: Stages can be drawn as a list

With `variant: "list"` the stages widget SHALL draw one row per stage with a round marker, the current stage's marker
filled, its label bold and "you are here" beside it, and a stage's `hint` beside the others. The current row SHALL carry
`aria-current="step"`.

#### Scenario: Board PqOfferte

- **GIVEN** a draft quote and the stage Expired with the hint "after 30 days"
- **WHEN** the Status card draws the list
- **THEN** Draft reads "you are here" and Expired reads "after 30 days"
