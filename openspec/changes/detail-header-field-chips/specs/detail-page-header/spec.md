# detail-page-header Delta: detail-header-field-chips

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [detail-header-field-chips](../../)

## Purpose

The `CnDetailPage` header shows the fields that identify an object as chips,
declared by the manifest. Finding A01 of the dossiq round 2 analysis.

## ADDED Requirements

### Requirement: A detail page may declare header fields

The manifest v2 schema SHALL accept `config.headerFields[]` on a detail page,
each entry a property key or an object `{ key, format, labelField,
colorField, warnWhenPast }`. `CnDetailPage` SHALL render one chip per entry
in a row under the title, in the declared order. A page without the key SHALL
render no row.

#### Scenario: Five chips in order

- **GIVEN** `headerFields: ["identifier", "caseType", "status", "assignee", "deadline"]` and an object with all five set
- **WHEN** the page renders
- **THEN** five chips render under the title in that order

#### Scenario: Unknown key refused

- **GIVEN** `headerFields: ["nope"]` on a schema without `nope`
- **WHEN** the manifest is validated
- **THEN** validation fails naming the page and the key

@e2e include Render a detail page with five header fields; assert the chip texts and their order.

### Requirement: Chips render by format and never blank

`format` SHALL select the renderer: `text`, `mono`, `badge`, `user`, `date`.
A `$ref` value SHALL render `labelField` of the referenced object and SHALL
fall back to the id in `mono` when the reference does not resolve. A badge
SHALL map `colorField` through the shared variant map and render neutral for
an unknown value. A date with `warnWhenPast` SHALL take the error variant when
past. An empty value SHALL render no chip, and a row with no chips SHALL not
render.

#### Scenario: Status badge from a reference

- **GIVEN** `{ key: "status", format: "badge", labelField: "name", colorField: "color" }` and a status object `{ name: "In review", color: "warning" }`
- **WHEN** the page renders
- **THEN** a badge reads "In review" with the warning variant

#### Scenario: Unresolved reference shows the id

- **GIVEN** a `caseType` reference to a deleted object
- **WHEN** the page renders
- **THEN** the chip shows the id in mono and no error is thrown

#### Scenario: Overdue deadline

- **GIVEN** `{ key: "deadline", format: "date", warnWhenPast: true }` and a deadline yesterday
- **WHEN** the page renders
- **THEN** the chip carries the error variant and a title with the full date

#### Scenario: Empty value, no chip

- **GIVEN** an object without an assignee
- **WHEN** the page renders
- **THEN** no assignee chip renders and the other chips keep their order

@e2e include Render a detail page whose status is a reference with a colour and whose deadline is past; assert the badge variant classes and the absence of a chip for an empty field.

### Requirement: Chips are readable by assistive technology and in print

Each chip SHALL expose the property title and its value as one accessible
name. The row SHALL print as plain text.

#### Scenario: Screen reader reads title and value

- **GIVEN** a chip for `identifier` with value "2026-00012"
- **WHEN** a screen reader reaches it
- **THEN** it reads "Identifier, 2026-00012"

@e2e include Assert the accessible name of the identifier chip on a rendered detail page.
