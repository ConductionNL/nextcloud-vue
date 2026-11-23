# plan-widget Delta: plan-widget

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [plan-widget](../../)

## Purpose

A record's planned steps, from OpenRegister's case layer, in every app.

## ADDED Requirements

### Requirement: A record shows its planned steps

The `plan` detail widget SHALL read the record's plan from OpenRegister's case layer and SHALL draw its items as a tree of stages and items, each level in position order, with each item's state. It SHALL offer Start on an enabled discretionary item and Complete or Stop where the item's type and state allow, and SHALL send each move to OpenRegister, then read the plan again and refresh the page. A refused move SHALL be shown in OpenRegister's words. A 404 SHALL show `emptyText`; any other failure SHALL show an error with a retry.

#### Scenario: Completing a task

- **GIVEN** a case whose plan has the active task "Ask advice" under the stage Intake
- **WHEN** the handler presses Complete on it
- **THEN** the widget posts the transition to OpenRegister and shows the plan it reads back

#### Scenario: OpenRegister is down

- **GIVEN** the plan read fails with a 500
- **THEN** the widget shows an error with a retry, not an empty plan
