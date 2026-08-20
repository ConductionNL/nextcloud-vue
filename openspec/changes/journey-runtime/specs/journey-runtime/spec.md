# journey-runtime Delta: journey-runtime

**Status**: in-progress
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [journey-runtime](../../)

## Purpose

The one renderer for an OpenRegister `journey`, in-page and in a modal.
Composes `CnFormPage` per form step and adds sequence, branching, review,
submit and resume. Implements the renderer half of ADR-085 and the
"one renderer, three hosts" requirement in
`hydra/openspec/changes/portaliq-phase-two/specs/forms-and-journeys/spec.md`.
Related: ADR-072 (component absorption), ADR-010 (NL Design).

## ADDED Requirements

### Requirement: A form step MUST be rendered by CnFormPage, not re-implemented

`CnJourney` SHALL mount `CnFormPage` for each `form` step, passing that form's
config unchanged. Field rendering, `visibleWhen` evaluation and
`fieldValidation` enforcement SHALL remain `CnFormPage`'s.

#### Scenario: Field behaviour is identical inside and outside a journey

- **GIVEN** one form config
- **WHEN** it is rendered standalone by `CnFormPage` and as a journey step
- **THEN** the fields, their conditional visibility and their validation
  messages are identical

#### Scenario: The journey does not validate fields itself

- **GIVEN** a field failing its declared validation
- **WHEN** the filer attempts to advance
- **THEN** the message shown is `CnFormPage`'s, and no second validation
  implementation produced it

### Requirement: Steps MUST support two levels, conditions and non-navigable groups

`CnJourney` SHALL render a progress indicator supporting a group with
sub-steps, one level deep. A step or sub-step MAY declare a condition
determining whether it appears. A group MAY be displayed without being
directly navigable.

#### Scenario: A conditional sub-step disappears when its condition is false

- **GIVEN** a group whose second sub-step is conditional
- **WHEN** the condition is false
- **THEN** that sub-step is neither displayed nor reachable, and the remaining
  steps are numbered contiguously

#### Scenario: A non-navigable group cannot be jumped to

- **GIVEN** a group marked non-navigable with two sub-steps
- **WHEN** the filer clicks the group heading
- **THEN** navigation does not occur; its sub-steps remain individually
  reachable

#### Scenario: Three levels are refused

- **GIVEN** a journey declaring a sub-step with its own sub-steps
- **WHEN** it is rendered
- **THEN** the renderer reports the error rather than rendering a third level

### Requirement: Branching MUST evaluate only the shared visibleWhen predicate

Branch rules SHALL be evaluated through the shared `$defs.visibleWhen`
evaluator, with its local / endpoint / source modes, its closed operator set,
and its fail-safe behaviour. `CnJourney` SHALL contain no other condition
evaluator.

#### Scenario: A branch on a previous answer selects the matching step

- **GIVEN** a step whose rules route on a previously-answered field
- **WHEN** the filer answers and advances
- **THEN** the matching step renders

#### Scenario: An unevaluable rule falls through rather than guessing

- **GIVEN** a rule whose source query errors
- **WHEN** the filer advances
- **THEN** the rule evaluates false and the default step renders
- **AND** the failure is reported to the run

### Requirement: The review step MUST show every answer collected so far

A `review` step SHALL display the answers from every preceding step, grouped by
step, with a way to return to the step that produced each.

#### Scenario: Answers from several forms appear together

- **GIVEN** a journey whose first two steps are different forms
- **WHEN** the review step renders
- **THEN** answers from both appear, grouped by their step

#### Scenario: A correction returns to the originating step

- **GIVEN** the review step
- **WHEN** the filer chooses to correct one answer
- **THEN** the journey returns to that answer's step with its values intact

### Requirement: A journey MUST be resumable in both hosts without losing answers

`CnJourney` and `CnJourneyDialog` SHALL persist answers to the run as steps
complete, and SHALL restore the recorded step and answers on resume. Closing
the dialog SHALL NOT discard staged answers.

#### Scenario: Closing the modal keeps the answers

- **GIVEN** a journey in `CnJourneyDialog`, two steps in
- **WHEN** the dialog is closed and reopened
- **THEN** it resumes at the recorded step with the recorded answers

#### Scenario: Resuming in a page continues a run started in a modal

- **GIVEN** a run started in `CnJourneyDialog`
- **WHEN** it is resumed by `CnJourney` in a page
- **THEN** it continues from the same step with the same answers

### Requirement: A host MUST NOT extend the vocabulary

A host mounting `CnJourney` or `CnJourneyDialog` SHALL supply mount, chrome and
theme only. It SHALL NOT register a step type, field type, validation rule or
branch operator.

#### Scenario: A host-local step type is refused

- **GIVEN** a host registering a step type absent from the journey vocabulary
- **WHEN** the gate runs
- **THEN** it fails, naming the host and the type

#### Scenario: One journey renders identically in every host

- **GIVEN** one journey object
- **WHEN** it renders in-page, in a modal, and in OpenBuild
- **THEN** the step sequence, field set, validation messages and submit
  behaviour are identical

### Requirement: The journey renderer MUST be route-split

`CnJourney`, `CnJourneyDialog` and their dependencies SHALL be loaded on
demand. A page that renders no journey SHALL NOT transfer their code.

#### Scenario: A journey-free page does not pay for the renderer

- **GIVEN** a portal page rendering no journey
- **WHEN** its first-load transfer is measured
- **THEN** the journey chunk is absent
- **AND** the measurement is of bytes transferred, not of the build's report of
  what it emitted

### Requirement: The progress indicator MUST be a library component emitting NL Design markup

A `CnProcessSteps` component SHALL render the step indicator with NL Design
component classes and tokens. A React design-system package SHALL NOT be
introduced to provide it.

#### Scenario: The indicator carries NL Design classes

- **GIVEN** a rendered journey under an active theme
- **WHEN** the indicator's markup is inspected
- **THEN** NL Design component classes are present and token values resolve
  from the theme

#### Scenario: Step state is announced, not only coloured

- **GIVEN** a journey at step two of three
- **WHEN** the indicator is read by assistive technology
- **THEN** the current, completed and upcoming steps are distinguishable
  without relying on colour
