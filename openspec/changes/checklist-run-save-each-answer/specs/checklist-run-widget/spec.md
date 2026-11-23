# checklist-run-widget Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [checklist-run-save-each-answer](../../)

## Purpose

A run can keep each answer as soon as it is given.

## ADDED Requirements

### Requirement: A run can save each answer as it is given

When `content.saveEachAnswer` is `true` or a number of milliseconds, CnChecklistRunWidget SHALL save the changed answers
of the open page that long (800 ms for `true`) after the last change, without the user moving on. Changes within the
wait SHALL save in one save. A save SHALL NOT start while another runs, so an answer is never created twice. An answer
waiting to save SHALL save when the widget is removed. Without the option the widget SHALL save when the user moves on
or finishes, as before.

#### Scenario: An answer saves without Next

- **GIVEN** `saveEachAnswer: true`
- **WHEN** the user picks "No" and waits
- **THEN** the answer is saved and `savedText` shows, while the same question stays open

#### Scenario: Next during a save

- **GIVEN** `saveEachAnswer: true` and an answer being saved
- **WHEN** the user presses Next
- **THEN** the answer is created once and the next question opens

#### Scenario: Without the option

- **GIVEN** no `saveEachAnswer`
- **WHEN** the user picks an answer and waits
- **THEN** nothing is saved until Next
