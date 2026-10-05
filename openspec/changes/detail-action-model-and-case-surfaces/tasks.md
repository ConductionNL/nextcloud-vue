# Tasks: detail-action-model-and-case-surfaces

> Action model, case surfaces, schema, docs (ADR-032 `kind: code`).

## Implementation Tasks

### Task 1: Shared rules
- **spec_ref**: `openspec/changes/detail-action-model-and-case-surfaces/specs/detail-action-model/spec.md#requirement-primary-action-follows-the-stage`
- **files**: `src/utils/detailActionModel.js`, `src/utils/dueRule.js`, `tests/utils/detailActionModel.spec.js`, `tests/utils/dueRule.spec.js`
- [x] Implement
- [x] Test

### Task 2: New components
- **spec_ref**: `openspec/changes/detail-action-model-and-case-surfaces/specs/detail-action-model/spec.md#requirement-next-step-card`
- **files**: `src/components/CnNextStepCard/`, `src/components/CnDocumentReviewList/`, `src/components/CnConversationThread/`, their docs and specs
- [x] Implement
- [x] Test

### Task 3: Tabs, board, kanban, navigation
- **spec_ref**: `openspec/changes/detail-action-model-and-case-surfaces/specs/detail-action-model/spec.md#requirement-tab-counts-and-overflow`
- **files**: `src/components/CnTabs/`, `src/components/CnTabsWidget/`, `src/components/CnBoardView/`, `src/components/CnObjectKanban/`, `src/components/CnAppNav/`
- [x] Implement
- [x] Test

### Task 4: Detail page and manifest schema
- **spec_ref**: `openspec/changes/detail-action-model-and-case-surfaces/specs/detail-action-model/spec.md#requirement-quick-actions`
- **files**: `src/components/CnDetailPage/CnDetailPage.vue`, `src/schemas/app-manifest-v2.schema.json`, `docs/components/cn-detail-page.md`
- [x] Implement
- [x] Test
