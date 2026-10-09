# Tasks: notes-on-a-file

> Library half of filinq `work-document-notes` (row `wk-notes`). `kind: code`.
> Checkbox budget: 3 tasks x 2 = 6 unindented `- [ ]` lines (cap 20).

## Implementation tasks

### Task 1: `useFileComments`
- **spec_ref**: `openspec/changes/notes-on-a-file/specs/notes-mentions-autocomplete/spec.md#requirement-file-comments-are-usable-without-the-card`
- **files**: `src/composables/useFileComments.js`, `src/composables/index.js`, `src/index.js`, `tests/composables/useFileComments.spec.js`
- **acceptance_criteria**:
  - REPORT, POST and DELETE go to `/remote.php/dav/comments/files/{fileId}` with the bodies of design D2; the REPORT response parses to the shared note shape
  - Verify: jest with recorded DAV responses
- [x] Implement
- [x] Test

### Task 2: The file source in `CnNotesCard`
- **spec_ref**: `openspec/changes/notes-on-a-file/specs/notes-mentions-autocomplete/spec.md#requirement-the-notes-card-takes-a-file-as-its-source`
- **files**: `src/components/CnNotesCard/CnNotesCard.vue`, `tests/components/CnNotesCardFileSource.spec.js`
- **acceptance_criteria**:
  - `fileId` without object props uses the file source; object props keep the object source
  - A 403 or 404 shows no notes and no add field
  - Verify: jest; mutation check: calling the object endpoint with `fileId` set reddens the test
- [x] Implement
- [x] Test

### Task 3: Docs
- **spec_ref**: `openspec/changes/notes-on-a-file/specs/notes-mentions-autocomplete/spec.md#requirement-the-notes-card-takes-a-file-as-its-source`
- **files**: `docs/components/cn-notes-card.md`
- **acceptance_criteria**:
  - Docs show both sources and say that mention notifications on files come from Nextcloud's comments app
  - Verify: `npm run check:docs`, `npm run check:docs-fresh`
- [x] Implement
- [x] Test

> `npm run check:docs-fresh` is not run here: needs the docusaurus install (the generated partial is regenerated at the end).
