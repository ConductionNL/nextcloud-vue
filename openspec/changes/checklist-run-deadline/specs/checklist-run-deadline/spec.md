# checklist-run-deadline Delta: checklist-run-deadline

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [checklist-run-deadline](../../)

## Purpose

A user sees how long a run still lasts, knows their answers are saved, and can finish from any page.

## ADDED Requirements

### Requirement: The time left follows the record's deadline

With `deadlineField` the widget SHALL show the time left from that moment on the open record, in the `timer` role with no live announcement per second. It SHALL count from the clock, not from
ticks, and correct a device clock through `serverNowField`. It SHALL announce the time left once at `timeWarningSeconds` and once at the last minute. At zero it SHALL save the open page
and finish with `reason` `deadline`, also with required questions open. A failed save SHALL leave the run open with the error, and the next Next SHALL finish it. A timed run SHALL finish once.

#### Scenario: Board LqLlToetsMaken "Resterende tijd: 18:42"

- **GIVEN** a deadline 18 minutes and 42 seconds away and `timeLeftText` "Resterende tijd: {time}"
- **THEN** the widget reads "Resterende tijd: 18:42"

#### Scenario: The time runs out

- **GIVEN** an open answer and a required question without one
- **WHEN** the time reaches zero
- **THEN** the answer is saved, and `finished` carries `reason` `deadline`

#### Scenario: The save fails at zero

- **WHEN** the save at zero fails
- **THEN** the run does not finish and shows the error
- **WHEN** the user presses Next and the save succeeds
- **THEN** `finished` carries `reason` `deadline`

### Requirement: The saved line is true when it shows

With `savedText` the widget SHALL show that text in the `status` role only while no answer is unsaved, at least one question is answered and the last save did not fail.

#### Scenario: An answer changes

- **GIVEN** the saved line shows
- **WHEN** the user changes an answer
- **THEN** the line goes away until the next save succeeds

### Requirement: A button finishes from any page

With `submitLabel` the widget SHALL show a button with that label on every page, and no Finish on the last page. Pressing it SHALL save the page and finish. A required question without an answer
SHALL hold it back and open that question's page. Enter on the last page SHALL NOT finish.

#### Scenario: A required question is open

- **GIVEN** question 2 of 3 is required and has no answer
- **WHEN** the user presses the button on page 1
- **THEN** the run does not finish, and the widget shows question 2
