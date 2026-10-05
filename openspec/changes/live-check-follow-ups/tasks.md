# Tasks: live-check-follow-ups

## Implementation Tasks

### Task 1: Schema version 2.43.0 and a content ledger
- **spec_ref**: `openspec/changes/live-check-follow-ups/specs/live-check-follow-ups/spec.md#requirement-the-manifest-schema-version-moves-with-its-content`
- **files**: `src/schemas/app-manifest-v2.schema.json`, `scripts/manifest-schema-hash.js`, `scripts/record-manifest-schema-hash.js`, `tests/schemas/`
- [x] Implement
- [x] Test

### Task 2: A link card looks like a card
- **spec_ref**: `openspec/changes/live-check-follow-ups/specs/live-check-follow-ups/spec.md#requirement-a-link-card-looks-like-a-card`
- **files**: `src/components/CnLinkCardsPage/CnLinkCardsPage.vue`, `e2e/`
- [x] Implement
- [x] Test

### Task 3: Page headings clear the navigation toggle
- **spec_ref**: `openspec/changes/live-check-follow-ups/specs/live-check-follow-ups/spec.md#requirement-a-page-heading-clears-the-navigation-toggle`
- **files**: `src/components/CnLinkCardsPage/`, `src/components/CnReportsPage/`, `src/components/CnStorePage/`, `src/components/CnWikiPage/`
- [x] Implement
- [x] Test

### Task 4: An attention card says when it could not check
- **spec_ref**: `openspec/changes/live-check-follow-ups/specs/live-check-follow-ups/spec.md#requirement-an-attention-card-says-when-it-could-not-check`
- **files**: `src/components/CnBannerWidget/CnBannerWidget.vue`, `src/components/CnDashboardPage/CnDashboardPage.vue`, `l10n/`
- [x] Implement
- [x] Test

### Task 5: A page below a list marks one menu entry
- **spec_ref**: `openspec/changes/live-check-follow-ups/specs/live-check-follow-ups/spec.md#requirement-a-page-below-a-list-marks-one-menu-entry`
- **files**: `src/components/CnAppNav/CnAppNav.vue`, `tests/components/CnAppNavActiveQuery.spec.js`
- [ ] Implement
- [ ] Test
