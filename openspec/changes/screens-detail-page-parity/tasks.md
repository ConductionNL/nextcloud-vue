# Tasks: screens-detail-page-parity

> The detail page of the screens under the board look (ADR-032 `kind: code`).
> Checkbox budget: 7 tasks x 2 = 14 unindented `- [ ]` lines (cap 20).
> Every task: `npm test` and `npm run build` green, JSDoc on new props, the
> component reference doc updated, and a unit test with @vue/test-utils.
> Depends on `screens-chrome-parity` task 1 (the look switch).

## Implementation tasks

### Task 1: The two-row header
- **spec_ref**: `openspec/changes/screens-detail-page-parity/specs/detail-page-board-look/spec.md#requirement-the-detail-header-is-two-rows-on-the-ground`
- **files**: `src/components/CnDetailPage/CnDetailPage.vue`, `src/css/detail-page.css`, `src/css/look-board.css`, `src/schemas/app-manifest-v2.schema.json`, `tests/components/CnDetailPageBoardHeader.spec.js`
- **acceptance_criteria**:
  - h1 28px on row 1; pills, breadcrumb, middle dot and meta on row 2; no breadcrumb above
  - `headerMeta` validates and fills from the object; no dot without meta
  - Header field chips render on row 2 when declared
- [ ] Implement
- [ ] Test

### Task 2: The header button order
- **spec_ref**: `openspec/changes/screens-detail-page-parity/specs/detail-page-board-look/spec.md#requirement-the-detail-header-buttons-follow-one-order`
- **files**: `src/components/CnDetailPage/CnDetailPage.vue`, `src/components/CnActionsMenu/CnActionsMenu.vue`, `tests/components/CnDetailPageBoardButtons.spec.js`
- **acceptance_criteria**:
  - Quick actions, Edit, buildiq, More, in that order whatever the manifest order
  - More is labelled; no primary when the next-step card shows
- [ ] Implement
- [ ] Test

### Task 3: The folder tab strip
- **spec_ref**: `openspec/changes/screens-detail-page-parity/specs/detail-page-board-look/spec.md#requirement-folder-tabs-take-the-board-strip`
- **files**: `src/components/CnTabs/CnTabs.vue`, `src/components/CnTabs/CnTab.vue`, `src/components/CnDetailPage/CnDetailPage.vue`, `src/css/look-board.css`, `tests/components/CnTabsBoardLook.spec.js`
- **acceptance_criteria**:
  - No primary top edge, grey borderless badge, no icons, labelled Actions at the end
  - `tabsLabel` names the tab list; the first panel card joins the strip
- [ ] Implement
- [ ] Test

### Task 4: Tabs in the body column
- **spec_ref**: `openspec/changes/screens-detail-page-parity/specs/detail-page-board-look/spec.md#requirement-the-tabs-and-their-panel-take-the-body-column`
- **files**: `src/components/CnDetailPage/CnDetailPage.vue`, `src/css/detail-page.css`, `e2e/screens-detail-page-parity.e2e.js`
- **acceptance_criteria**:
  - The strip and panel live in the body column; the side column starts level with the strip
  - The side column drops under the body when there is no room
- [ ] Implement
- [ ] Test

### Task 5: History as the last tab
- **spec_ref**: `openspec/changes/screens-detail-page-parity/specs/detail-page-board-look/spec.md#requirement-history-is-the-last-tab`
- **files**: `src/components/CnDetailPage/CnDetailPage.vue`, `src/integrations/builtin/activity/CnActivityTab.vue`, `src/components/CnTimelineWidget/CnTimelineWidget.vue`, `tests/components/CnDetailPageHistoryTab.spec.js`
- **acceptance_criteria**:
  - The activity tab is named History and rendered last; no duplicate body section
  - Kind chips with counts, the visibility select and the 34px icon rail
  - Coordinate with `the-activity-tab-reads-the-merged-feed`, which owns the data
- [ ] Implement
- [ ] Test

### Task 6: The next-step card
- **spec_ref**: `openspec/changes/screens-detail-page-parity/specs/detail-page-board-look/spec.md#requirement-the-next-step-card-takes-the-board-anatomy`
- **files**: `src/components/CnNextStepCard/CnNextStepCard.vue`, `tests/components/CnNextStepCardBoardLook.spec.js`
- **acceptance_criteria**:
  - Kicker in the tonal primary text colour, success-tinted done marker, 44px button
- [ ] Implement
- [ ] Test

### Task 7: Body and side cards
- **spec_ref**: `openspec/changes/screens-detail-page-parity/specs/detail-page-board-look/spec.md#requirement-body-and-side-cards-take-the-board-anatomy`
- **files**: `src/components/CnDetailPage/CnDetailPage.vue`, `src/components/CnDetailCard/CnDetailCard.vue`, `src/components/CnObjectDataWidget/CnObjectDataWidget.vue`, `src/css/look-board.css`, `src/schemas/app-manifest-v2.schema.json`, `tests/components/CnDetailCardsBoardLook.spec.js`
- **acceptance_criteria**:
  - Body card radius 12, padding 20px 22px, h2 17px; field grid with hairlines
  - Side cards with 15px muted headings and no Actions menu; notice first; History card last with the identifier line
- [ ] Implement
- [ ] Test
