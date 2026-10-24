# Tasks: active-chip-group-name-over-bare-facet

### Task 1: A group filter chip reads the group name when the facet only echoes the id
- **spec_ref**: `openspec/changes/active-chip-group-name-over-bare-facet/specs/active-filter-line-board-look/spec.md#requirement-a-facet-label-that-repeats-the-value-does-not-name-the-chip`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`
- [x] Implement: skip a bucket label equal to the value
- [x] Test: `tests/components/CnIndexFilterLabels.spec.js`
