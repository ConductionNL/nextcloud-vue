# Tasks: screens-chrome-parity

> The board look switch and the chrome of the screens (ADR-032 `kind: code`).
> Checkbox budget: 8 tasks x 2 = 16 unindented `- [ ]` lines (cap 20).
> Every task: `npm test` and `npm run build` green, JSDoc on new props, the
> component reference doc updated, and a unit test with @vue/test-utils.

## Implementation tasks

### Task 1: The look switch and the board stylesheet
- **spec_ref**: `openspec/changes/screens-chrome-parity/specs/app-look/spec.md#requirement-an-app-can-take-the-board-look`
- **files**: `src/schemas/app-manifest-v2.schema.json`, `src/components/CnAppRoot/CnAppRoot.vue`, `src/components/CnPageRenderer/CnPageRenderer.vue`, `src/css/look-board.css`, `src/css/index.css`, `tests/components/CnAppRootLook.spec.js`
- **acceptance_criteria**:
  - `look` validates at the root and as `config.look` on a page; an unknown value fails naming the key
  - `cn-look-board` on the root, `cn-look-nextcloud` or `cn-look-board` on a page that overrides, nearest wins
  - `look-board.css` defines the nine `--cn-board-*` properties and nothing outside `.cn-look-board`
  - A snapshot of an index page without the key is unchanged
- [x] Implement
- [x] Test

### Task 2: The board page frame
- **spec_ref**: `openspec/changes/screens-chrome-parity/specs/app-look/spec.md#requirement-page-content-takes-the-board-frame`
- **files**: `src/css/look-board.css`, `src/css/page-header.css`, `src/css/detail-page.css`, `src/css/index-page.css`, `src/css/dashboard.css`, `e2e/screens-chrome-parity.e2e.js`
- **acceptance_criteria**:
  - Padding 24px 28px, max width 1240px, 20px block gap under the look
  - The 56px header inset only while the navigation is closed
- [x] Implement
- [ ] Test — not run: no browser/e2e run in this lane; `e2e/screens-chrome-parity.e2e.js` is not written. A stylesheet contract test (`tests/css/lookBoardChrome.spec.js`) pins the values.

### Task 3: The board header button
- **spec_ref**: `openspec/changes/screens-chrome-parity/specs/app-look/spec.md#requirement-header-buttons-share-one-board-button`
- **files**: `src/css/look-board.css`, `src/components/CnActionsMenu/CnActionsMenu.vue`, `e2e/screens-chrome-parity.e2e.js`
- **acceptance_criteria**:
  - 40px, radius 8, 14px weight 600, outlined secondary and filled primary on index, detail, dashboard and settings headers
  - The header Actions or More menu shows its label under the look
- [x] Implement — The header "Actions"/"More" menu already shows its label (`forceName` + `menuName`), so `CnActionsMenu.vue` is unchanged.
- [ ] Test — not run: no browser/e2e run in this lane; `e2e/screens-chrome-parity.e2e.js` is not written. A stylesheet contract test (`tests/css/lookBoardChrome.spec.js`) pins the values.

### Task 4: The navigation anatomy and counts
- **spec_ref**: `openspec/changes/screens-chrome-parity/specs/layout-components/spec.md#requirement-the-navigation-takes-the-board-anatomy`
- **files**: `src/components/CnAppNav/CnAppNav.vue`, `src/schemas/app-manifest-v2.schema.json`, `src/css/look-board.css`, `tests/components/CnAppNavBoardLook.spec.js`
- **acceptance_criteria**:
  - Width 264px, entry 42px, captions 12px uppercase, active entry on the tonal primary
  - `counterVariant` validates and maps to the attention pill under the look and to the highlighted bubble without it
  - Covers the counts requirement: `openspec/changes/screens-chrome-parity/specs/layout-components/spec.md#requirement-a-navigation-count-can-ask-for-attention`
- [x] Implement
- [x] Test — unit tests in `tests/components/CnAppNavBoardLook.spec.js` and `tests/css/lookBoardChrome.spec.js`; the measurement against werkplek/AppZijbalk is not run (no browser).

### Task 5: The footer order and the card
- **spec_ref**: `openspec/changes/screens-chrome-parity/specs/layout-components/spec.md#requirement-the-navigation-footer-reads-help-then-advanced`
- **files**: `src/components/CnAppNav/CnAppNav.vue`, `tests/components/CnAppNavBoardLook.spec.js`
- **acceptance_criteria**:
  - Help renders before Advanced under the look whatever the declared order
  - No "More" group; the card is pushed to the bottom
- [x] Implement
- [x] Test — `tests/components/CnAppNavBoardLook.spec.js`; the `margin-top: auto` card is asserted in the stylesheet only, not in a browser.

### Task 6: The buildiq square
- **spec_ref**: `openspec/changes/screens-chrome-parity/specs/layout-components/spec.md#requirement-the-buildiq-square-is-one-square-everywhere`
- **files**: `src/components/CnBuildiqEditButton/CnBuildiqEditButton.vue`, `src/components/CnIndexPage/CnIndexPage.vue`, `src/components/CnActionsBar/CnActionsBar.vue`, `src/components/CnDashboardPage/CnDashboardPage.vue`, `src/components/CnAdminSettingsShell/CnAdminSettingsShell.vue`, `tests/components/CnBuildiqSquare.spec.js`
- **acceptance_criteria**:
  - `--cn-buildiq-color` with `#f36c21` as the default
  - 40px square in the header at the position the spec names; no second one in the actions bar
- [ ] Implement — not built: the dashboard page keeps the square before its Actions menu (no "primary button" rule applied there), and `CnDashboardPage` is untouched. Index, settings and the shell are built.
- [x] Test — `tests/components/CnBuildiqSquare.spec.js` (index, actions bar, settings page, colour variable).

### Task 7: The settings shell and section cards
- **spec_ref**: `openspec/changes/screens-chrome-parity/specs/settings-board-look/spec.md#requirement-the-admin-settings-shell-takes-the-board-header`
- **files**: `src/components/CnAdminSettingsShell/CnAdminSettingsShell.vue`, `src/components/CnSettingsSection/CnSettingsSection.vue`, `src/components/CnSettingsPage/CnSettingsPage.vue`, `src/components/CnVersionInfoCard/CnVersionInfoCard.vue`, `tests/components/CnSettingsBoardLook.spec.js`
- **acceptance_criteria**:
  - h1 28px, Documentation button before the buildiq square, no documentation icon
  - Cards in `minmax(420px, 1fr)`, radius 12, padding 22px 24px; `wide: true` spans the row
  - Covers `openspec/changes/screens-chrome-parity/specs/settings-board-look/spec.md#requirement-settings-sections-are-cards-in-a-grid` and `#requirement-the-version-card-takes-the-board-facts-and-footer`
- [x] Implement
- [x] Test — `tests/components/CnSettingsBoardLook.spec.js`; grid columns and card anatomy not measured in a browser.

### Task 8: The save placement
- **spec_ref**: `openspec/changes/screens-chrome-parity/specs/settings-board-look/spec.md#requirement-a-settings-page-saves-in-one-declared-place`
- **files**: `src/components/CnSettingsPage/CnSettingsPage.vue`, `src/components/CnSettingsSection/CnSettingsSection.vue`, `src/schemas/app-manifest-v2.schema.json`, `tests/components/CnSettingsSaveMode.spec.js`
- **acceptance_criteria**:
  - `saveMode` section, page and `autosave` each render the number of save buttons the spec names
  - A manifest that sets `saveMode` and a per-section save fails validation
  - Without the keys the save bar renders as before
- [x] Implement
- [x] Test — `tests/components/CnSettingsSaveMode.spec.js`; schema 2.68.0 adds `saveMode` and `autosave`. A "section save" is the section key `save`.
