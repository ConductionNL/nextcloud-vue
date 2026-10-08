# Design: tasks-tab-flow-task-source

Read on openregister development (`TaskController`, `TaskService`, the
`flow-tasks` main spec) and PR branch `spec/missing-parts` (#4452), and
nextcloud-vue development `3eefb4f00`, on 7 October 2026. No board draws the
tab; rows follow the `/flow-tasks` inbox rows so a task looks the same in both
places (openregister `record-tasks-tab` intro).

## D1. Reuse the inbox store

`useTaskInboxStore` already reads `/api/flow-tasks` and forwards `objectUuid`.
The tab passes `{objectUuid, scope: "all"}`; the endpoint still decides which
tasks the caller may see. Create and the verbs are added to that store when
absent, so the inbox page and the tab share one implementation.

## D2. What create sends

A flat body with the task entity's own keys, the ones `TaskBuilder::fromData`
reads (openregister `record-tasks-tab` design D-2, corrected in #4455):

| Key | For a user | For a group |
|---|---|---|
| `title` | required | required |
| `description` | optional | optional |
| `dueAt` | optional, ISO 8601 | optional, ISO 8601 |
| `objectUuid`, `registerId`, `schemaId` | the record's | the record's |
| `assignee` | the user's uid | absent |
| `performerType` | absent | `"group"` |
| `candidateGroups` | absent | `["<gid>"]` |

`fromData` defaults `performerType` to `user`, so a group task without
`performerType: "group"` would be a user task with no assignee. A group task
is a pool until someone claims it. The body never carries `requester` or
`state`: OpenRegister pins the requester to the caller and refuses a
terminal state. The assignee picker searches users and groups
through Nextcloud's sharee API. A 404 says "You can no longer open this
record".

## D3. Which verbs a row offers: the row's `can` list

Every row of `GET /api/flow-tasks` carries `can`, the verbs the caller may
run on that task now (`claim`, `unclaim`, `assign`, `reassign`, `delegate`,
`offer`, `resolve`, `complete`, `cancel`), computed by OpenRegister with the
same authorization check each verb's endpoint runs plus the state rules
(openregister #4455, `record-tasks-tab` D-4). The tab shows exactly the verbs
in `can` that it has a control for (Claim, Unclaim, Reassign, Complete,
Cancel), in that order, and derives nothing from state, assignee or
requester. A row without a `can` key (an OpenRegister that predates it)
offers no verbs and keeps the link to the task page, where the verbs are.
`can` is advice for the screen, not a grant: a verb the server still refuses
(a race, a membership that changed) shows the refusal on the row and leaves
the row as it was.

## D4. Not VTODO

The `flow-tasks` source shows flow tasks only. Projected VTODOs and personal
reminders stay with the `vtodo` source in the Integrations tab
(openregister D-3). The empty state says where personal reminders live.

## Files

- `src/components/CnObjectSidebar/CnTasksTab.vue`, `CnObjectSidebar.vue`, `CnObjectSidebar.md`
- `src/composables/useTaskInboxStore.js` (create, verbs)
- `tests/components/CnTasksTabFlowTasks.spec.js`, `tests/composables/useTaskInboxStore.create.spec.js`
