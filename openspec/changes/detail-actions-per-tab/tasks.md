# Tasks: detail-actions-per-tab

### Task 1: Quick actions and the next step card can follow the open tab
- **spec_ref**: `openspec/changes/detail-actions-per-tab/specs/detail-page/spec.md#requirement-quick-actions-and-the-next-step-card-can-follow-the-open-tab`
- **files**: `src/utils/detailActionModel.js`, `src/components/CnDetailPage/CnDetailPage.vue`, `src/schemas/app-manifest-v2.schema.json`
- [x] Implement: `onTab`, tab-scoped pinned actions, `nextStep.tabs` / `nextStep.notTabs`
- [x] Test: `tests/utils/detailActionModel.spec.js`, `tests/components/CnDetailPageActionsByTab.spec.js`
