# Tasks: condition-tree-editor

### Task 1: The tree
- **spec_ref**: `openspec/changes/condition-tree-editor/specs/condition-tree-editor/spec.md#requirement-a-user-builds-andor-groups-of-conditions`
- **files**: `src/components/CnConditionTreeEditor/CnConditionTreeNode.vue`, `src/components/CnConditionTreeEditor/conditionOperators.js`
- [x] Implement: groups, conditions, field reset, date operators, stored values kept
- [x] Test: `tests/components/CnConditionTreeEditor.spec.js`

### Task 2: The preview
- **spec_ref**: `openspec/changes/condition-tree-editor/specs/condition-tree-editor/spec.md#requirement-a-finished-tree-is-checked-and-counted-by-the-app`
- **files**: `src/components/CnConditionTreeEditor/CnConditionTreeEditor.vue`
- [x] Implement: debounced preview, count, errors by path, status and validity events
- [x] Test: `tests/components/CnConditionTreeEditor.spec.js`

### Task 3: Docs
- [x] `docs/components/cn-condition-tree-editor.md`

### Task 4: pipelinq
- [ ] Switch SegmentFormDialog from SegmentBuilder/SegmentRuleNode to CnConditionTreeEditor after pipelinq #2555 merges
