# Tasks: card-state-notices

### Task 1: The notice as a card state banner
- **spec_ref**: `openspec/changes/card-state-notices/specs/card-state-notices/spec.md#requirement-a-notice-is-a-card-state-banner`
- **files**: `src/components/CnNoticeWidget/CnNoticeWidget.vue`, `src/css/look-board-detail.css`
- [x] role, layout, actions, dismissible, `{path}` fill, `inline`
- [x] Test: `tests/components/CardStateNotices.spec.js`

### Task 2: Cards, tables and dialogs draw notices
- **spec_ref**: `openspec/changes/card-state-notices/specs/card-state-notices/spec.md#requirement-a-card-draws-its-notices-at-the-top`
- **files**: `src/components/CnCardNotices/*`, `src/components/CnWidgetWrapper/CnWidgetWrapper.vue`, `src/components/CnDetailCard/CnDetailCard.vue`, `src/components/CnDataTable/CnDataTable.vue`, `src/components/CnDialog/CnDialog.vue`, `src/css/dialog.css`, `src/css/table.css`
- [x] `notices` prop, `#notice` slot, `visibleWhen` per notice, dismiss
- [x] Test: `tests/components/CardStateNotices.spec.js`

### Task 3: Detail widget notices and action answers
- **spec_ref**: `openspec/changes/card-state-notices/specs/card-state-notices/spec.md#requirement-a-detail-widget-declares-its-notices`
- **files**: `src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue`, `src/utils/cardNotices.js`, `src/utils/actionsDispatcher.js`, `src/components/CnIndexPage/manifestActionDispatch.js`
- [x] widget `notices`, `showNotice`, page channel by widget id
- [x] Test: `tests/components/CardStateNoticesHosts.spec.js`, `tests/utils/cardNoticesDispatch.spec.js`

### Task 4: Index page notices
- **spec_ref**: `openspec/changes/card-state-notices/specs/card-state-notices/spec.md#requirement-an-index-page-draws-its-notices-above-the-list`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`, `src/css/index-page.css`
- [x] `notices`, row api-call answers, the page channel
- [x] Test: `tests/components/CardStateNoticesHosts.spec.js`

### Task 5: Docs
- **files**: `docs/components/cn-notice-widget.md`, `docs/components/cn-card-notices.md`
- [x] Every content key, the `notices` prop on each surface, the envelope
