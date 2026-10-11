# workspace-filter Delta: abstract-start-card

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [abstract-start-card](../../)

## Purpose

Let a workspace page declare its "start" card (title, guidance, an object picker that puts an object in focus) instead
of shipping an app component.

## ADDED Requirements

### Requirement: A workspace filter can draw a start card

With `content.layout: "start"` the `workspace-filter` widget SHALL draw `title` and `description` (through the host
translate function) left of its control, and `link` (`{ label, route | href }`) after the control, wrapping on a
narrow cell. Without `layout` it SHALL render as before.

#### Scenario: Contact starten

- **GIVEN** `layout: "start"`, a title, a description and an `objectSource`
- **WHEN** the dashboard renders
- **THEN** the title and description sit left of the picker on one row

### Requirement: A workspace filter can pick an OpenRegister object

With `content.objectSource` `{ register, schema, labelField? }` the control SHALL be an object picker that searches
OpenRegister on the server and writes the picked object's id to the `writes` key. When the workspace holds no value
and neither `default` nor `allLabel` is set, the widget SHALL select the first object the source lists; a failed read
SHALL select nothing. The picker SHALL have an accessible name (`ariaLabel`, else the title, else the label).

#### Scenario: The first client is in focus

- **GIVEN** an `objectSource` over clients and an empty workspace
- **WHEN** the widget mounts
- **THEN** the first client's id is written to the workspace key

#### Scenario: A pick moves the focus

- **WHEN** the user picks another client
- **THEN** its id is written to the workspace key and `change` is emitted
