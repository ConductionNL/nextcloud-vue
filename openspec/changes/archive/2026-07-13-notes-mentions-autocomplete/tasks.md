# Tasks: notes-mentions-autocomplete

Spec: `openspec/changes/notes-mentions-autocomplete/specs/notes-mentions-autocomplete/spec.md`

## 1. Pure mention helpers

Spec ref: "Mentions SHALL persist using the canonical `@userId` / `@"user id"` token convention", "Inserting a mention from the composer uses the pure insertion helper".
Files: `src/utils/mentions.js` (new), `tests/utils/mentions.spec.js` (new).

- [x] 1.1 Implement `parseMentions(text)`, `extractMentionedIds(text)`, `serializeMentionToken(id)`, `detectMentionQuery(text, cursorPosition)`, `insertMentionToken(text, cursorPosition, id)`.
- [x] 1.2 Unit tests: simple id, quoted id-with-space, email-like text (no false positive), escaped `@`, adjacent punctuation, round-trip serialize→parse, unique-id extraction order, insertion mid-sentence, insertion at start/end of string, empty text.

## 2. Composer — swap textarea for NcRichContenteditable

Spec ref: "The note composer SHALL offer `@mention` autocomplete via the upstream rich input".
Files: `src/components/CnObjectSidebar/CnNotesTab.vue`, `tests/__mocks__/nextcloud-vue.js`.

- [x] 2.1 Add a stateful `NcRichContenteditable` stub to the shared `@nextcloud/vue` jest mock: `v-model`-compatible (`modelValue`/`update:modelValue`), calls the `auto-complete` prop function on a trailing `@query`, renders a suggestion list, supports ArrowUp/ArrowDown/Enter/Escape and mouse-click selection, inserts the serialized token via the same token format as `src/utils/mentions.js`.
- [x] 2.2 Replace `CnNotesTab`'s `<textarea>` with `<NcRichContenteditable multiline :auto-complete="fetchMentionSuggestions">`, keep `v-model="newNoteText"` semantics.
- [x] 2.3 Implement `fetchMentionSuggestions(search, callback)` calling `searchNextcloudUsers` (`src/utils/userAutocomplete.js`) and mapping results to the shape NcRichContenteditable/NcAutoCompleteResult expects.
- [x] 2.4 Component tests: `@` opens dropdown with mapped suggestions, ArrowDown+Enter inserts token, mouse click inserts token, Escape closes without inserting.

## 3. Rendering — mention chips in the note list

Spec ref: "Existing notes render mentions as chips, degrading gracefully for unknown users".
Files: `src/components/CnObjectSidebar/CnNotesTab.vue`.

- [x] 3.1 Add a per-instance mention display-name cache (`data()`), populated via `searchNextcloudUsers(id)` for each unique id found across the current `notes` list (resolve once, cache by id, tolerate lookup failure).
- [x] 3.2 Replace the plain `{{ note.message }}` `#subname` rendering with a `parseMentions`-driven render that renders `.cn-notes-tab__mention` chips (with `--unknown` modifier when unresolved) interleaved with plain text.
- [x] 3.3 Scoped CSS: chip background `var(--color-primary-element-light)`, text `var(--color-main-text)`, `--unknown` modifier reduced opacity — no hardcoded colors.
- [x] 3.4 Component tests: known-user chip shows resolved display name, unknown-user chip shows raw id with `--unknown` class, plain text around chips still renders.

## 4. Notification hook — `mention` event

Spec ref: "`CnNotesTab` emits a `mention` event on save; nc-vue does not dispatch notifications".
Files: `src/components/CnObjectSidebar/CnNotesTab.vue`, `src/components/CnObjectSidebar/CnObjectSidebar.vue`.

- [x] 4.1 On successful `addNote()`, parse the created note's id from the response body (fallback `null` if absent) and emit `mention` when `extractMentionedIds(savedText).length > 0`.
- [x] 4.2 On successful `saveEdit()`, emit `mention` using `editingNoteId` as `noteId` under the same condition.
- [x] 4.3 `CnObjectSidebar`: add `@mention="$emit('mention', $event)"` passthrough on its `CnNotesTab` usage.
- [x] 4.4 Component tests: mention event payload shape on create, on edit, and the no-mention no-event case.

## 5. Docs, lint, build, verification

Files: `docs/components/cn-notes-tab.md` (regenerated partial), `docs/components/cn-object-sidebar.md`, `package.json`/`package-lock.json` (only if a real dependency changed).

- [x] 5.1 Add JSDoc to every new/changed prop, event, method per the repo's docgen conventions; regenerate `docs/components/_generated/CnNotesTab.md` via `cd docusaurus && npm run prebuild:docs` (or accept CI's freshness diff locally).
- [x] 5.2 Document the new `mention` event on `CnObjectSidebar` in `docs/components/cn-object-sidebar.md`.
- [x] 5.3 Run `npm run lint`, `npm run check:jsdoc`, `npm test` (full suite, not bare `npx jest`) — all green.
- [x] 5.4 Run `npm run build` — succeeds.
- [x] 5.5 Revert any incidental `package-lock.json` churn if no real dependency changed.
