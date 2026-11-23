# Tasks: screens-card-parity

> Record and catalogue cards of the screens under the board look (ADR-032 `kind: code`).
> Checkbox budget: 4 tasks x 2 = 8 unindented `- [ ]` lines (cap 20).
> Every task: `npm test` and `npm run build` green, JSDoc on new props, the
> component reference doc updated, and a unit test with @vue/test-utils.
> Depends on `screens-chrome-parity` task 1 and `screens-index-list-parity` task 7.

## Implementation tasks

### Task 1: The board grid track
- **spec_ref**: `openspec/changes/screens-card-parity/specs/card-board-look/spec.md#requirement-the-card-grid-takes-the-board-track`
- **files**: `src/components/CnCardGrid/CnCardGrid.vue`, `src/components/CnStorePage/CnStorePage.vue`, `src/css/look-board.css`, `tests/components/CnCardGridBoardLook.spec.js`
- **acceptance_criteria**:
  - 260px minimum as the theme token: `minmax(var(--cn-card-grid-min, 260px), 1fr)` and `var(--cn-card-grid-gap, 16px)` under the look; 320px without it
- [x] Implement
- [x] Test

### Task 2: The record card
- **spec_ref**: `openspec/changes/screens-card-parity/specs/card-board-look/spec.md#requirement-a-record-card-has-a-head-facts-and-one-action`
- **files**: `src/components/CnObjectCard/CnObjectCard.vue`, `src/components/CnCardGrid/CnCardGrid.vue`, `src/schemas/app-manifest-v2.schema.json`, `tests/components/CnObjectCardBoardLook.spec.js`
- **acceptance_criteria**:
  - `status`, `leading` and `footerAction` props with defaults that render today's card
  - `cardFields` validates; default the first four columns
  - No hover lift under the look; checkbox only in selection mode
  - The metadata slot still replaces the facts list
- [x] Implement
- [x] Test

### Task 3: The cards view shares toolbar and footer
- **spec_ref**: `openspec/changes/screens-card-parity/specs/card-board-look/spec.md#requirement-the-cards-view-keeps-the-list-toolbar-and-footer`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`, `e2e/screens-card-parity.e2e.js`
- **acceptance_criteria**:
  - Toolbar and footer boxes unchanged when switching between table and cards
- [x] Implement
- [x] Test — measured in a browser: toolbar box identical and footer box equal to within the card border (1px) when switching table to cards; the e2e found the table card was only as wide as its columns (flex 0 1 auto in a row body), fixed in look-board-index.css; `e2e/screens-index-card-chrome-parity.e2e.js` (library harness, not a live Nextcloud)

### Task 4: The catalogue card
- **spec_ref**: `openspec/changes/screens-card-parity/specs/card-board-look/spec.md#requirement-a-catalogue-card-has-an-icon-a-state-and-one-action`
- **files**: `src/components/CnStorePage/CnStorePage.vue`, `src/components/CnIntegrationWidgetGrid/CnIntegrationWidgetGrid.vue`, `tests/components/CnStorePageBoardLook.spec.js`
- **acceptance_criteria**:
  - Icon chip, kind and publisher line, state pill per install state, footer with version and one named action
- [x] Implement
- [x] Test
