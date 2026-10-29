# interaction-form-summary-rows Delta: interaction-form-summary-rows

**Status**: in-progress
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [interaction-form-summary-rows](../../)

## Purpose

Let a manifest set how high the contact log form draws its summary.

## ADDED Requirements

### Requirement: The summary textarea takes its rows from the content

CnInteractionFormWidget SHALL draw the summary textarea `content.summaryRows`
rows high when that is a positive number, and four rows high otherwise.

#### Scenario: A manifest asks for three rows

- **GIVEN** an `interaction-form` widget with `content.summaryRows: 3`
- **WHEN** the form renders
- **THEN** the summary textarea has `rows="3"`

#### Scenario: No rows configured

- **GIVEN** an `interaction-form` widget without `summaryRows`, or with 0
- **WHEN** the form renders
- **THEN** the summary textarea has `rows="4"`, as before
