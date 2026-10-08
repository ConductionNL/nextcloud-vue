# saved-views-ui Delta: view-presentation-picker

## ADDED Requirements

### Requirement: A view's presentation is picked when it is saved

`CnViewPresentationPicker` SHALL take a JSON `schema` and a presentation
`value`, SHALL offer the view types Table, Board and Calendar, and SHALL emit
`input` with a presentation in OpenRegister's shape:
`{viewType: "table"}`, `{viewType: "kanban", kanban: {groupByField, cardFields?, columnOrder?}}`
or `{viewType: "calendar", calendar: {dateField, endDateField?}}`. Each field
picker SHALL offer only the schema properties that can serve its role: a
group field is a string with an `enum`, the lifecycle state property, or a
single relation; card fields are scalars, at most four; date fields have
`format` `date` or `date-time`. A type whose required role has no candidate
SHALL be disabled with the reason.

#### Scenario: A caseworker saves a board grouped by status

- **GIVEN** a schema with an enum property `status` and `CnSaveViewDialog` opened with that schema
- **WHEN** the caseworker picks Board and the group field `status`, and saves
- **THEN** `confirm` SHALL carry `presentation: {viewType: "kanban", kanban: {groupByField: "status"}}`

#### Scenario: A schema without a date cannot be a calendar

- **GIVEN** a schema with no property of format `date` or `date-time`
- **WHEN** the picker renders
- **THEN** Calendar SHALL be disabled and SHALL say the schema has no date field

#### Scenario: Switching back to a table drops the board settings

- **GIVEN** a picker with value `{viewType: "kanban", kanban: {groupByField: "status"}}`
- **WHEN** the user picks Table
- **THEN** `input` SHALL be emitted with `{viewType: "table"}` and no `kanban` key

#### Scenario: Column order follows the enum

- **GIVEN** Board with group field `status` whose enum is `new`, `open`, `done`
- **WHEN** the user drags `done` before `open`
- **THEN** `kanban.columnOrder` SHALL be `["new", "done", "open"]`

@e2e include Open the save dialog on an index page; pick Board and a status field; save; reopen the view; assert it draws as a board grouped by that field.

### Requirement: The save dialog and the edit form carry the picker

`CnSaveViewDialog` SHALL accept an optional `schema` prop; when set it SHALL
render the picker and SHALL emit `confirm({ name, isPublic, sharedWith, presentation })`.
Without `schema` it SHALL render and emit as today. `CnSavedViewsControl`
SHALL show the picker in the edit form of a view whose `@self.access` is
`owner` or `write`. A save refused with a message naming `kanban.groupByField`,
`calendar.dateField` or `calendar.endDateField` SHALL keep the form open and
show the message under that picker.

#### Scenario: No schema, no picker

- **GIVEN** `CnSaveViewDialog` without a `schema` prop
- **WHEN** the user saves
- **THEN** no picker SHALL render and `confirm` SHALL carry no `presentation` key

#### Scenario: A refused date field stays on screen

- **GIVEN** an edit form for a calendar view whose date field was removed from the schema
- **WHEN** the save answers 400 with a message naming `calendar.dateField`
- **THEN** the form SHALL stay open with that message under the date field picker

#### Scenario: A reader cannot change the presentation

- **GIVEN** a view with `@self.access: "read"`
- **WHEN** the user opens the view's menu
- **THEN** no edit form and no picker SHALL be offered
