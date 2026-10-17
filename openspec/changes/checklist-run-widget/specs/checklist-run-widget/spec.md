# checklist-run-widget Delta: checklist-run-widget

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [checklist-run-widget](../../)

## Purpose

A checklist can be answered a page of questions at a time from manifest configuration, as an inspector does on a phone.

## ADDED Requirements

### Requirement: A checklist run shows a page of questions at a time

The `checklist-run` widget SHALL list its questions from `content.questions` (`register`, `schema`, a token-resolved
`filter`, ordered by `orderField`) and SHALL NOT list them while a filter token is unresolved. It SHALL show `pageSize`
questions per page (default 1) with the position ("Question 7 of 24") and the `caption`, each question as a fieldset
whose legend is the question: `yes_no` and `yes_no_na` as radio buttons, `choice` as radio buttons of the record's
`options`, any other type as a text field, with an optional note. Next SHALL keep a page whose required question is
unanswered and say so; otherwise it SHALL save the page and show the next one, moving focus to the position line and
announcing it. On the last page it SHALL save, dispatch `finishAction` when set and emit `finished`.

#### Scenario: Board DqInspectie

- **GIVEN** a run whose checklist has 24 questions, ordered by `position`
- **THEN** the widget shows "Question 1 of 24" and the first question with its choices
- **WHEN** the inspector answers it and presses Next
- **THEN** the answer is saved and the second question shows, with focus on "Question 2 of 24"

#### Scenario: A required question

- **GIVEN** a required question without an answer
- **WHEN** the inspector presses Next
- **THEN** the page stays and says the question must be answered

### Requirement: Answers are saved under the reader's own rights

With `content.answers` the widget SHALL read the answers given so far (one record per question, matched on
`questionField`) and fill the form with them. It SHALL save a changed answer through the OpenRegister object API:
update the existing record, or create one with the `create` fields, tokens resolved. A photo SHALL be uploaded through
that answer object's file upload and added to `photosField`, keeping the photos already there. With `saveAction` the
widget SHALL dispatch that action per changed answer with `{ questionId, value, note }` as its last argument and offer
no photos.

#### Scenario: A new answer with a photo

- **GIVEN** `answers: { register, schema, filter: { run: "@objectId" }, photosField: "photos", create: { run: "@objectId" } }`
- **WHEN** the inspector answers a question, adds a photo and presses Next
- **THEN** an answer record is created with the run, the question and the answer
- **AND** the photo is uploaded to that answer and added to its photos

#### Scenario: An app that stores answers itself

- **GIVEN** `saveAction: { type: "handler", handler: "saveAnswer" }`
- **WHEN** the inspector answers a question and presses Next
- **THEN** the handler receives the answer and no object is written by the widget
