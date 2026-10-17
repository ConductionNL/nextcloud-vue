# Tasks: register-mapping-board-look

### Task 1: Board look
- **spec_ref**: `openspec/changes/register-mapping-board-look/specs/register-mapping/spec.md#requirement-the-board-look-draws-one-open-group-and-compact-rows`
- **files**: `src/components/CnRegisterMapping/CnRegisterMapping.vue`, `l10n/en.json`, `l10n/nl.json`
- [x] Implement: open group table, compact rows, status chips, save at the end
- [x] Test: `tests/components/CnRegisterMappingBoardLook.spec.js`

### Task 2: Lean fetch
- **spec_ref**: `openspec/changes/register-mapping-board-look/specs/register-mapping/spec.md#requirement-only-mapped-registers-have-their-schemas-fetched`
- **files**: `src/components/CnRegisterMapping/CnRegisterMapping.vue`
- [x] Implement: register list without `_extend`, `registers/{id}/schemas` for mapped ids, 404 fallback
- [x] Test: `tests/components/CnRegisterMappingBoardLook.spec.js`
