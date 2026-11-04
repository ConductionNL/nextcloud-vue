# Tasks: conflict-resolve-card

### Task 1: conflictFields
- **spec_ref**: `openspec/changes/conflict-resolve-card/specs/conflict-resolve-card/spec.md#requirement-a-card-shows-both-versions-of-each-differing-field`
- **files**: `src/utils/conflictFields.js`
- [x] Implement: named fields, the record's own list, or every top-level key without bookkeeping; equal fields left out
- [x] Test: `tests/components/CnConflictResolveCard.spec.js` (describe `conflictFields`)

### Task 2: CnConflictResolveCard
- **spec_ref**: `openspec/changes/conflict-resolve-card/specs/conflict-resolve-card/spec.md#requirement-a-card-shows-both-versions-of-each-differing-field`
- **files**: `src/components/CnConflictResolveCard/CnConflictResolveCard.vue`, `src/components/CnConflictResolveCard/index.js`, `src/components/CnWidgetGrid/registerDashboardWidgets.js`, `src/utils/libraryWidgetKeys.js`, `src/index.js`, `src/components/index.js`
- [x] Implement: read open records, one card per record, both lines per field, field labels when several differ
- [x] Implement: buttons off until `resolve.url` and `resolve.capability`, with the reason as their description
- [x] Implement: post `{ resolution }`, drop the card, refusal in the server's words, read failure said
- [x] Test: `tests/components/CnConflictResolveCard.spec.js`

### Task 3: Strings and docs
- **files**: `l10n/en.json`, `l10n/nl.json`, `docs/components/cn-conflict-resolve-card.md`
- [x] English and Dutch library strings
- [x] Docs page with every content key, the prop and the event
