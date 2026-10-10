# Tasks: screens-tab-counts-parity

## Implementation Tasks

### Task 1: A tab can count its list
- **spec_ref**: `openspec/changes/screens-tab-counts-parity/specs/tab-counts/spec.md#requirement-a-tab-can-count-its-list`
- **files**: `src/components/CnTabsWidget/CnTabsWidget.vue`, `docs/components/cn-tabs-widget.md`
- [x] Implement: `countSourceOf`, `refreshWidgetCounts` (mount, record change, refresh), count precedence
- [x] Test: child list with filter and context, named list, count and countField win, failure and no list, nothing without countFrom, another record (`tests/components/CnTabsWidgetCountFrom.spec.js`)

### Task 2: Live check
- [ ] DqContact and PtAccount on :8080 (not run: needs a release and the apps to declare `countFrom`)
