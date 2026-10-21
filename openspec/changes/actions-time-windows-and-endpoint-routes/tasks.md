# Tasks: actions-time-windows-and-endpoint-routes

### Task 1: `@now±N(m|h|d)`
- **spec_ref**: `openspec/changes/actions-time-windows-and-endpoint-routes/specs/declarative-actions/spec.md#requirement-a-condition-can-compare-against-an-instant-relative-to-now`
- [x] Implement: `src/utils/sentinelTokens.js`, `src/utils/resolveFilterTokens.js`, schema 2.140.0
- [x] Test: `tests/utils/resolveFilterTokensNowDelta.spec.js`

### Task 2: Endpoint forms: required fields and onSuccessRoute
- **spec_ref**: `openspec/changes/actions-time-windows-and-endpoint-routes/specs/declarative-actions/spec.md#requirement-an-endpoint-form-can-open-the-record-the-endpoint-answers`
- [x] Implement: `src/components/CnActionButtons/CnActionButtons.vue`, `src/utils/actionsDispatcher.js`
- [x] Test: `tests/components/CnActionButtonsEndpointForm.spec.js`

### Task 3: Admin only buttons
- **spec_ref**: `openspec/changes/actions-time-windows-and-endpoint-routes/specs/declarative-actions/spec.md#requirement-an-admin-only-action-stays-hidden-as-a-button`
- [x] Implement: `src/components/CnDetailPage/CnDetailPage.vue`
- [x] Test: `tests/components/CnDetailPageActionModel.spec.js`
