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

The task entity's canonical keys, as `GET` returns them:
`{title, description?, dueAt?, objectUuid, registerId, schemaId}` plus
`assignee: <uid>` for a user or `candidateGroups: [<gid>]` for a group. A
group task is a pool until someone claims it (`flow-tasks` main spec, "A
group task has no assignee until someone claims it"). openregister's
`record-tasks-tab` design D-2 sketches a nested shape
(`assignee: {type, id}`, `object: {uuid, register, schema}`); the canonical
keys are what the read returns and what `TaskService::create` stores, so the
builder confirms against `TaskBuilder::fromData` and follows it if it reads
the nested shape instead. The assignee picker searches users and groups
through Nextcloud's sharee API. A 404 says "You can no longer open this
record".

## D3. Which verbs a row offers

The task row carries no list of allowed verbs. The `flow-tasks` spec states
the rules: claim needs pool membership; complete needs the assignee (or a
delegate, or an admin); reassign and cancel need the requester (or a
supervisor, or an admin); unclaim needs the current assignee. The tab offers:

| Verb | Shown when |
|---|---|
| Claim | no assignee, task not terminal |
| Unclaim, Complete | assignee is the current user |
| Reassign, Cancel | requester is the current user, or the user is an admin |

Pool membership, delegation and supervision are server knowledge, so a Claim
can still be refused; the refusal shows on the row and the row stays as it
was (openregister D-4). An OpenRegister follow-up could add a per-row `can`
list, which the tab would then use instead; listed in the hand-back.

## D4. Not VTODO

The `flow-tasks` source shows flow tasks only. Projected VTODOs and personal
reminders stay with the `vtodo` source in the Integrations tab
(openregister D-3). The empty state says where personal reminders live.

## Files

- `src/components/CnObjectSidebar/CnTasksTab.vue`, `CnObjectSidebar.vue`, `CnObjectSidebar.md`
- `src/composables/useTaskInboxStore.js` (create, verbs)
- `tests/components/CnTasksTabFlowTasks.spec.js`, `tests/composables/useTaskInboxStore.create.spec.js`
