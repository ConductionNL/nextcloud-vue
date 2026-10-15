# Tasks: index-header-open-form

### Task 1: Open-form and open-modal header actions on an index page
- **spec_ref**: `openspec/changes/index-header-open-form/specs/index-header/spec.md#requirement-an-index-header-action-can-open-the-create-form`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`
- [x] Implement: `dialogHeaderActions` handed to a menu-mode CnActionButtons; `onHeaderAction` runs its entry; the list reloads after a create
- [x] Test: `tests/components/CnIndexPageHeaderOpenForm.spec.js`; e2e `e2e/l14-index-header-open-form.e2e.js`
