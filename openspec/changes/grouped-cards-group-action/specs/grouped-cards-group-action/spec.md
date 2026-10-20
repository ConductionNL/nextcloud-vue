# grouped-cards-group-action Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [grouped-cards-group-action](../../)

## Purpose

A group of cards can carry its own action, such as adding a card to it.

## ADDED Requirements

### Requirement: Every group can carry an action

A grouped-cards widget with `groupAction` SHALL draw that action in every group, with each `@group.<path>` token in the
action's strings replaced by that group's URL-encoded value, and SHALL draw none for a group lacking such a value. An
`open-form` action whose `endpoint.method` is `POST` SHALL open an empty form and post its declared fields to the
endpoint.

#### Scenario: Add a task to a phase

- **GIVEN** a phase board with a groupAction posting to `/api/case-types/@objectId/phases/@group.id/steps`
- **WHEN** the administrator picks "Taak toevoegen" under "Fase 2: Beoordeling", names the task and saves
- **THEN** the task is posted to that phase's steps endpoint
