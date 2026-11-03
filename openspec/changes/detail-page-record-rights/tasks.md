# Tasks: detail-page-record-rights

### Task 1: A detail page can read the record's rights
- **spec_ref**: `openspec/changes/detail-page-record-rights/specs/detail-page-record-rights/spec.md#requirement-a-detail-page-can-read-the-records-rights`
- **files**: `src/components/CnDetailPage/CnDetailPage.vue`, `src/components/CnPageRenderer/CnPageRenderer.vue`, `src/schemas/app-manifest-v2.schema.json`
- [x] Implement: `permissions` prop, `@self.can` on both reads, `recordCan`, `cnRecordCan`, slot `can`
- [x] Test: `tests/components/CnDetailPageRecordRights.spec.js`, `tests/components/CnPageRendererDetailObject.spec.js`

### Task 2: Edit controls follow the record's update right
- **spec_ref**: `openspec/changes/detail-page-record-rights/specs/detail-page-record-rights/spec.md#requirement-edit-controls-follow-the-records-update-right`
- **files**: `src/components/CnDetailPage/CnDetailPage.vue`, `src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue`
- [x] Implement: Edit, edit-role header actions and inline editors off while `can.update` is false
- [x] Test: `tests/components/CnDetailPageRecordRights.spec.js`

### Task 3: A banner action can run a declared action on the record
- **spec_ref**: `openspec/changes/detail-page-record-rights/specs/detail-page-record-rights/spec.md#requirement-a-banner-action-can-run-a-declared-action-on-the-record`
- **files**: `src/components/CnBannerWidget/CnBannerWidget.vue`, `docs/components/cn-banner-widget.md`
- [x] Implement: `declaredAction` runs through an `api-call` with a refresh, gated on `@self.can`
- [x] Test: `tests/components/CnBannerWidgetDeclaredAction.spec.js`
