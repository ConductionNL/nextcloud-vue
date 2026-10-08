# object-tasks-tab Specification

## Purpose

A record's Tasks tab lists, creates and moves the OpenRegister flow tasks
anchored on that record. Store and rules: OpenRegister `flow-tasks`.

## ADDED Requirements

### Requirement: The tab lists the flow tasks anchored on the record

`CnTasksTab` SHALL accept `source` with values `vtodo` (default, unchanged
behaviour) and `flow-tasks`. With `flow-tasks` it SHALL list
`GET /apps/openregister/api/flow-tasks?objectUuid=<objectId>` showing title,
assignee (or the candidate group), due date, state and an overdue mark; open
tasks first by due date, finished tasks folded under "Done". A row title
SHALL link to the task's page. The tab SHALL emit `count` with the number of
open tasks.

#### Scenario: Two open tasks and one done

- **GIVEN** a record with two open flow tasks and one completed one
- **WHEN** the tab renders with `source="flow-tasks"`
- **THEN** the two open tasks SHALL be listed first by due date, the completed one under Done, and `count` SHALL be emitted with 2

#### Scenario: An overdue task stands out

- **GIVEN** an open task whose `dueAt` has passed
- **WHEN** the tab renders
- **THEN** its due date SHALL be marked overdue

#### Scenario: The default source is unchanged

- **GIVEN** `CnTasksTab` without a `source` prop
- **WHEN** it renders
- **THEN** it SHALL read `/api/objects/{register}/{schema}/{id}/tasks` as today and SHALL NOT call `/api/flow-tasks`

@e2e include Open a record's Tasks tab with source flow-tasks; add a task for a colleague due Friday; assert it is listed; log in as the colleague; assert it is in their inbox.

### Requirement: The tab creates a task on the record

With `source="flow-tasks"` the tab SHALL offer a form with title (required),
assignee (a user or a group, from Nextcloud's sharee API), optional due date
and optional description. Saving SHALL send `POST /apps/openregister/api/flow-tasks`
with a flat body: `title`, `description` and `dueAt` when given, the record's
`objectUuid`, `registerId` and `schemaId`, then either `assignee` (a uid) for
a user or `performerType: "group"` with `candidateGroups: [<gid>]` for a
group. The body SHALL NOT carry `requester` or `state`. On 201 the task SHALL
be listed.
On 404 the form SHALL say the user can no longer open this record. Any other
refusal SHALL keep the form open with the server's message.

#### Scenario: A caseworker hands a callback to a colleague

- **GIVEN** a caseworker on a record's Tasks tab
- **WHEN** they add "Bel aanvrager terug" for user `jan`, due Friday
- **THEN** the POST body SHALL carry the title, `assignee: "jan"`, the due date and the record's `objectUuid`, `registerId` and `schemaId`
- **AND** it SHALL carry no `performerType`, `requester` or `state`
- **AND** the task SHALL be listed on the tab

#### Scenario: A task for a group

- **GIVEN** the same form
- **WHEN** the caseworker picks the group `backoffice`
- **THEN** the POST body SHALL carry `performerType: "group"`, `candidateGroups: ["backoffice"]`, the record's anchor and no `assignee`

#### Scenario: Access lost

- **GIVEN** the POST answers 404
- **WHEN** the response arrives
- **THEN** the form SHALL say the user can no longer open this record

### Requirement: A row offers only the verbs the user can run

Each row SHALL offer exactly the verbs in its `can` list that the tab has a
control for (Claim, Unclaim, Reassign, Complete, Cancel), and SHALL NOT
derive verbs from state, assignee or requester. A row without a `can` key
SHALL offer no verbs and keep its link to the task page. A verb the server
refuses SHALL show the server's message on the row and leave the row's state
and assignee as they were.

#### Scenario: Someone else's task

- **GIVEN** a task row with `can: []`
- **WHEN** the current user views the tab
- **THEN** the row SHALL offer no verb

#### Scenario: A pool task

- **GIVEN** an open pool task whose row carries `can: ["claim"]`
- **WHEN** the user views the tab
- **THEN** the row SHALL offer Claim and nothing else

#### Scenario: The assignee completes

- **GIVEN** a row with `can: ["unclaim", "delegate", "complete"]`
- **WHEN** the assignee views the tab
- **THEN** the row SHALL offer Unclaim and Complete, and no Cancel or Reassign

#### Scenario: A refused claim

- **GIVEN** a row with `can: ["claim"]` whose pool membership changed since the list loaded
- **WHEN** the user clicks Claim and the server answers 403 with a message
- **THEN** the row SHALL show that message and still have no assignee
