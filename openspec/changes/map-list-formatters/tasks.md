# Tasks: map-list-formatters

### Task 1: A map list reads display names through the app's formatters
- **spec_ref**: `openspec/changes/map-list-formatters/specs/map-list-formatters/spec.md#requirement-a-map-list-reads-display-names-through-the-apps-formatters`
- **files**: `src/utils/fillTemplate.js`, `src/utils/mapList.js`, `src/components/CnIndexPage/CnIndexPage.vue`
- [x] Implement: pill `formatter`, formatter tokens, `sub` as a list
- [x] Test: `tests/components/CnIndexPageMapListFormatters.spec.js`

### Task 2: The card for rows without a place stays under the list
- **spec_ref**: `openspec/changes/map-list-formatters/specs/map-list-formatters/spec.md#requirement-the-card-for-rows-without-a-place-stays-under-the-list`
- **files**: `src/css/index-page.css`
- [x] Implement: the list scrolls, rows and the card keep their height
- [x] Test: `tests/components/CnIndexPageMapListFormatters.spec.js`
