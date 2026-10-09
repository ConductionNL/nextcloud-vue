# Tasks: notes-replies-group-mentions-and-images

> Rows `pg-record-comments` (buildiq), `col-threaded-comments`, `col-group-mention`, `col-comment-images` (planninq). `kind: code`.
> Checkbox budget: 5 tasks x 2 = 10 unindented `- [ ]` lines (cap 20).

## Implementation tasks

### Task 1: Shared composer and note card
- **spec_ref**: `openspec/changes/notes-replies-group-mentions-and-images/specs/notes-mentions-autocomplete/spec.md#requirement-a-note-can-be-answered-and-the-answer-stays-with-it`
- **files**: `src/components/CnNoteComposer/`, `src/components/CnNoteCard/CnNoteCard.vue`, `src/components/CnObjectSidebar/CnNotesTab.vue`, `src/components/CnNotesCard/CnNotesCard.vue`, `tests/components/CnNoteComposer.spec.js`
- **acceptance_criteria**:
  - Both surfaces render through the shared composer and card; existing notes tests still pass
  - Verify: jest; `npm run check:smoke`
- [x] Implement — `CnNoteComposer` and `CnNoteBody` are the shared composer and note renderer; `CnNoteCard` (the unrelated NcNoteCard clone the spec file list names) is not touched
- [x] Test — `tests/components/CnNotesThreads.spec.js` and `tests/components/CnNoteImages.spec.js`; `npm run check:smoke` is not run: needs a browser

### Task 2: Replies
- **spec_ref**: `openspec/changes/notes-replies-group-mentions-and-images/specs/notes-mentions-autocomplete/spec.md#requirement-a-note-can-be-answered-and-the-answer-stays-with-it`
- **files**: `src/components/CnObjectSidebar/CnNotesTab.vue`, `src/components/CnNotesCard/CnNotesCard.vue`, `tests/components/CnNotesThreads.spec.js`
- **acceptance_criteria**:
  - Reply posts `parentId`; replies group one level under their top-level note; a reply to a reply attaches to the top
  - No `parentId` key in the response: no Reply
  - Verify: jest over both response shapes
- [x] Implement
- [x] Test

### Task 3: Group mentions
- **spec_ref**: `openspec/changes/notes-replies-group-mentions-and-images/specs/notes-mentions-autocomplete/spec.md#requirement-the-composer-mentions-groups`
- **files**: `src/utils/userAutocomplete.js`, `src/utils/mentions.js`, `tests/utils/mentionsGroups.spec.js`
- **acceptance_criteria**:
  - Suggestions include groups; `@"group/<gid>"` round-trips through parse and serialise
  - The event carries `mentionedGroupIds`
  - Verify: jest; the existing email-is-not-a-mention tests still pass
- [x] Implement
- [x] Test

### Task 4: Pasted images
- **spec_ref**: `openspec/changes/notes-replies-group-mentions-and-images/specs/notes-mentions-autocomplete/spec.md#requirement-a-pasted-image-becomes-part-of-the-note`
- **files**: `src/components/CnNoteComposer/`, `src/components/CnNoteCard/CnNoteCard.vue`, `tests/components/CnNoteImages.spec.js`
- **acceptance_criteria**:
  - Paste and drop of `image/*` upload through `filesMultipart` and insert the reference at the caret
  - Only same-record OpenRegister file URLs render as images; others render as links
  - Verify: jest; mutation check: removing the allow-list reddens the foreign image test
- [x] Implement — the image reference is added at the end of the note, not at the caret (the rich input offers no caret in its model)
- [x] Test

### Task 5: Accessibility and docs
- **spec_ref**: `openspec/changes/notes-replies-group-mentions-and-images/specs/notes-mentions-autocomplete/spec.md#requirement-the-composer-mentions-groups`
- **files**: `tests/a11y/CnNotesTab.a11y.spec.js`, `docs/components/cn-notes-card.md`, `docs/components/cn-object-sidebar.md`
- **acceptance_criteria**:
  - Replies are a nested list with the parent named for screen readers; Reply buttons name the author they answer
  - Docs describe the `parentId` capability signal and the event payload
  - Verify: `npm run check:a11y`, `npm run check:docs`, `npm run check:docs-fresh`
- [x] Implement
- [ ] Test — `npm run check:docs` run; `npm run check:a11y` (`tests/a11y/CnNotesTab.a11y.spec.js`) is not run: needs a browser; `check:docs-fresh` is not run: the orchestrator regenerates docs/components/_generated

## Cross-project

- openregister: accept `parentId` on note create and return `parentId` on every note. Listed for the openregister lane. — not run: needs openregister (Reply stays hidden until notes carry a `parentId` key)
