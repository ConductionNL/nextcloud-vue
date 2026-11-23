# tasks-record-source Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [tasks-record-source](../../)

## Purpose

A `type: "detail"` page can show one engine task through `entitySource: "tasks"`.

## ADDED Requirements

### Requirement: The tasks source reads one task

The `tasks` source SHALL be a record source: `loadRecord(uuid)` SHALL read `GET /api/flow-tasks/{uuid}`, `record(uuid)`
SHALL return that task keyed on its uuid with the display fields a list row carries, and a refused or missing read
SHALL leave no record and keep its HTTP status for `recordError(uuid)`.

#### Scenario: DqTaak

- **GIVEN** a detail page with `entitySource: "tasks"` opened on a task's uuid
- **THEN** the page reads that task from the task engine and shows its title, state and priority
