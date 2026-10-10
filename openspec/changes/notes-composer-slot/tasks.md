# Tasks: a slot above the note composer

- [x] 1.1 Add the `composer-before` scoped slot above `CnNoteComposer` in `CnNotesTab`, with
      `setText` and `text` in scope, and `setComposerText()` behind `setText`.
      `files_likely_affected`: `src/components/CnObjectSidebar/CnNotesTab.vue`
- [x] 1.2 `tests/components/CnNotesTabComposerSlot.spec.js`: no slot renders nothing extra; the
      slot is handed `setText` and `text`; `setText` fills the composer; `null` empties it.
