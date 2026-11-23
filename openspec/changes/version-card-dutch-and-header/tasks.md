# Tasks: version-card-dutch-and-header

### Task 1: Strings through the catalogue, in Dutch
- **spec_ref**: `openspec/changes/version-card-dutch-and-header/specs/settings-board-look/spec.md#requirement-the-admin-chrome-reads-in-the-readers-language`
- **files**: `src/components/CnVersionInfoCard/CnVersionInfoCard.vue`, `src/components/CnRegisterMapping/CnRegisterMapping.vue`, `l10n/nl.json`, `l10n/en.json`
- [x] Implement
- [x] Test: `tests/l10n/adminChromeDutch.spec.js`

### Task 2: The header wraps instead of overlapping
- **spec_ref**: `openspec/changes/version-card-dutch-and-header/specs/settings-board-look/spec.md#requirement-no-header-button-covers-a-card-title`
- **files**: `src/css/look-board.css`
- [x] Implement: grid header, container query at 520px
- [x] Test: e2e `e2e/l15-admin-chrome-dutch.e2e.js` (Dutch text, no button box over a title box)
