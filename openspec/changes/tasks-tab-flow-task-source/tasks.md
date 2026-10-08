# Tasks: tasks-tab-flow-task-source

> `flow-tasks` source for `CnTasksTab` over OpenRegister `flow-tasks`
> (ADR-032 `kind: code`). Builds on `cn-tasks-entity-source`.

## Implementation tasks

### Task 1: Store create and verbs
- **spec_ref**: `openspec/changes/tasks-tab-flow-task-source/specs/object-tasks-tab/spec.md#requirement-the-tab-creates-a-task-on-the-record`
- **files**: `src/composables/useTaskInboxStore.js`, `tests/composables/useTaskInboxStore.create.spec.js`
- **acceptance_criteria**:
  - `createTask(data)` and `runVerb(uuid, verb, body)` if absent; refusals returned with the server's message
  - Flat create body per design D2: `performerType: "group"` with `candidateGroups` for a group, `assignee` for a user; never `requester` or `state`
  - JSDoc on new actions
- [ ] Implement
- [ ] Test

### Task 2: List and create in CnTasksTab
- **spec_ref**: `openspec/changes/tasks-tab-flow-task-source/specs/object-tasks-tab/spec.md#requirement-the-tab-lists-the-flow-tasks-anchored-on-the-record`
- **files**: `src/components/CnObjectSidebar/CnTasksTab.vue`, `src/components/CnObjectSidebar/CnObjectSidebar.vue`, `tests/components/CnTasksTabFlowTasks.spec.js`
- **acceptance_criteria**:
  - `source` prop, default `vtodo` unchanged
  - Open first by due date, Done folded, overdue marked, `count` emitted
  - Create form with `NcSelect` assignee (`inputLabel`) over the sharee API
- [ ] Implement
- [ ] Test

### Task 3: Verbs per row
- **spec_ref**: `openspec/changes/tasks-tab-flow-task-source/specs/object-tasks-tab/spec.md#requirement-a-row-offers-only-the-verbs-the-user-can-run`
- **files**: `src/components/CnObjectSidebar/CnTasksTab.vue`, `src/components/CnObjectSidebar/CnObjectSidebar.md`, `tests/components/CnTasksTabFlowTasks.spec.js`
- **acceptance_criteria**:
  - Verbs exactly from the row's `can` list (design D3); none without `can`; refusal on the row, row unchanged
  - `npm test` and `npm run build` pass
- [ ] Implement
- [ ] Test
