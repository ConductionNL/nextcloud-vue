# object-list-widget Delta: object-list-children

**Status**: in-progress
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: A list can show each row's child records under it

An object list with `children: { schema, filter, … }`, whose `filter` names the link to the row with an `@row.<field>` token, SHALL read the children of every loaded row in one query on the list of row values, and SHALL show each row's children in a full-width row under it as a nested list that reorders within its row, runs its own row actions, and adds, edits and deletes. A child added there SHALL carry its row's value in the link field and go last. After a write in a nested list, the parent SHALL read the children again.

#### Scenario: The lessons of each module of a course

- **GIVEN** a course with modules Plants and Cells, and lessons Leaves and Roots in Plants and Nucleus in Cells
- **WHEN** the course's module list with `children: { schema: "lesson", filter: { courseId: "@row.id" }, reorder: { field: "order" } }` loads
- **THEN** one request reads the lessons with `courseId[]` set to both module ids
- **AND** Leaves and Roots show under Plants, and Nucleus under Cells

#### Scenario: Moving a lesson within its module

- **GIVEN** Leaves (1) and Roots (2) under Plants
- **WHEN** the reader moves Leaves down
- **THEN** Roots gets order 1 and Leaves order 2, by PATCHes of `order` alone, and no other module's lessons are written

### Requirement: A list value in a filter matches any of its values

A filter value that is a list SHALL be sent as `field[]=` for each value, so that any of them matches; an empty list SHALL be left out.

#### Scenario: Learning plans of two learners

- **GIVEN** a filter `{ learnerId: ["a", "b"], lifecycle: "active" }`
- **WHEN** the list loads
- **THEN** the request carries `learnerId[]=a&learnerId[]=b` and `lifecycle=active`

### Requirement: A row action can address its row

A row action's `target` SHALL resolve `@row.<field>` tokens against the row it is on, URI-encoded, before it is dispatched, and such an action SHALL NOT render as a static link.

#### Scenario: Opening the composer for a lesson

- **GIVEN** a row action `{ type: "navigate", target: "/courses/m1/lessons/@row.id/compose" }`
- **WHEN** the reader runs it on lesson l2
- **THEN** the router goes to `/courses/m1/lessons/l2/compose`
