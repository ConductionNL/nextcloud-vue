# tasks-state-variants Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [tasks-state-variants](../../)

## Purpose

An app can tone a task's status pill by its state.

## ADDED Requirements

### Requirement: A task status pill can take its tone from its state

CnTasksWidget SHALL draw a task's status pill in `content.stateVariants[state]` when that is a badge variant. Otherwise
it SHALL draw info for an open task and default for a finished one.

#### Scenario: DqZaakTaken

- **GIVEN** the case task table with `stateVariants: { active: "purple", available: "warning", enabled: "warning" }`
- **THEN** a task in progress shows "In behandeling" purple and an unclaimed one "Open" amber
