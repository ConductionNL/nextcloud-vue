# Tasks: screens-form-override-labels-parity

## Implementation Tasks

### Task 1: Override text reads in the user's language
- **spec_ref**: `openspec/changes/screens-form-override-labels-parity/specs/form-override-labels/spec.md#requirement-override-text-reads-in-the-users-language`
- **files**: `src/utils/schema.js`, `l10n/nl.json`, `l10n/en.json`
- [x] Implement: `translateOverrideText` after the override merge; `optional` reads "niet verplicht"
- [x] Test: label, description, placeholder translated; no translate; unknown text; other keys; catalogue entry (`tests/utils/fieldsFromSchemaOverrideText.spec.js`)

### Task 2: Live check
- [ ] Open the new case form on :8080 after a release (not run: the apps run the released package)
