# checklist-run-photo-rule Delta: checklist-run-photo-rule

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [checklist-run-photo-rule](../../)

## Purpose

A checklist run holds an answer until the photo its question asks for is there, and can find its own record on a page
that has none.

## ADDED Requirements

### Requirement: A question can require a photo

With `fields.photoRequired` the widget SHALL read each question's photo rule and map it through `photoRequiredValues` onto
`never`, `always` or `{ whenAnswer }`. Every question of the page whose rule is not `never` SHALL get its own photo
control. Next SHALL hold the page and say that the answer needs a photo while a question whose rule applies (always, or
the answer equals `whenAnswer`) has no photo stored or attached.

#### Scenario: A "nee" needs its evidence

- **GIVEN** a question with `photoRequired: "if_no"` and `photoRequiredValues: { if_no: { whenAnswer: "nee" } }`
- **WHEN** the inspector answers "nee" and presses Next without a photo
- **THEN** the page stays and says the answer needs a photo
- **WHEN** the inspector attaches a photo and presses Next
- **THEN** the answer and the photo are saved

#### Scenario: A "ja" needs none

- **GIVEN** the same question answered "ja"
- **THEN** Next saves without a photo

### Requirement: A checklist run can pick its record by filter

With `record: { register, schema, filter, sort? }` the widget SHALL read the first record that matches `filter` (tokens
resolved, sorted by `sort`, newest first by default) under the reader's rights, and SHALL work on it as on a bound
record. With no match it SHALL show `emptyText`; while a filter token is unresolved it SHALL read nothing.

#### Scenario: A dashboard frame

- **GIVEN** `record: { register: "app", schema: "run", filter: { inspector: "@me", status: "in_execution" }, sort: { field: "startedAt", dir: "desc" } }` on a page without a record
- **THEN** the inspector's newest running run is shown

#### Scenario: Nothing running

- **GIVEN** no matching run
- **THEN** the widget shows its `emptyText`
