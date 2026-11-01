# rubric-scorer Delta: abstract-rubric-scorer

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [abstract-rubric-scorer](../../)

## Purpose

Score a record against a rubric from configuration, instead of an app component per scoring screen.

## ADDED Requirements

### Requirement: A rubric scorer draws one fieldset per criterion

The `rubric-scorer` widget SHALL read the rubric (an object by id, or a path of the page object) and draw each
criterion as a fieldset whose legend names it, with one radio per level showing its points. Each criterion's radios
SHALL form their own group. The scores stored on the scored record SHALL be preselected, and the total of the chosen
points SHALL be shown against the maximum.

#### Scenario: Marking an essay

- **GIVEN** a rubric with two criteria and a submission that already scored the first
- **WHEN** the widget renders
- **THEN** two fieldsets show, the first criterion's stored level is chosen, and the total reads "4 of 6 points"

### Requirement: A rubric scorer saves once and then transitions

A save SHALL write the scores (`[{criterionId, levelId, points}]` to `field`), the total (`totalField`) and the note
(`note.field`) to the scored record in one request. With `submitAction`, its button SHALL save and then run that
lifecycle transition on the record. With `requireAll`, that button SHALL wait until every criterion is scored and say
how many are left. A refused save SHALL show the server's message and keep the choices.

#### Scenario: Returning a marked submission

- **GIVEN** every criterion scored and a feedback text
- **WHEN** the teacher presses "Return to the learner"
- **THEN** one PATCH carries the scores, the total and the feedback, and the `return` transition runs after it

### Requirement: A rubric scorer is read only when scoring has closed

With `readOnly`, or when `readOnlyWhen` holds for the scored record, every radio and the note SHALL be disabled and
no save button SHALL show.

#### Scenario: A returned submission

- **GIVEN** `readOnlyWhen` `{ field: lifecycle, in: [returned] }` and a returned submission
- **WHEN** the widget renders
- **THEN** the levels show the stored scores and cannot be changed

### Requirement: A rubric scorer can score a record it creates

With `createIfMissing` `{ register, schema, filter, values }`, the widget SHALL score the first record of that schema
matching `filter` (tokens resolved), and when there is none it SHALL create one on the first save carrying `values`
and the scores, then run `submitAction` on it.

#### Scenario: A first self assessment

- **GIVEN** a submission with no self assessment yet
- **WHEN** the learner scores one criterion and submits
- **THEN** one self assessment is created with the submission, the scores and the total, and `submit` runs on it
