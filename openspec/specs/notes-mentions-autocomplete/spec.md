# notes-mentions-autocomplete Specification

## Purpose
`@mention` support for `CnNotesTab`: autocomplete in the note composer (reusing the upstream `NcRichContenteditable`), canonical `@userId` / `@"user id"` inline storage in the note text, chip rendering of stored mentions with graceful degradation for unknown users, and a frontend-only `mention` event that consuming apps translate into Nextcloud notifications from their own backend.
## Requirements
### Requirement: The note composer SHALL offer `@mention` autocomplete via the upstream rich input

`CnNotesTab`'s note composer SHALL render an `NcRichContenteditable` (from `@nextcloud/vue`, `multiline`) in place of the plain `<textarea>`, bound to a `fetchMentionSuggestions(search, callback)` method passed as the `auto-complete` prop. `fetchMentionSuggestions` SHALL call `searchNextcloudUsers(search)` (`src/utils/userAutocomplete.js`) and invoke `callback` with the mapped results (`{ id, label, subline, icon: 'icon-user', source: 'users' }`).

Typing `@` SHALL open the upstream suggestion dropdown. The dropdown SHALL be keyboard-navigable (ArrowUp/ArrowDown move the active suggestion, Enter selects it, Escape closes it) and mouse-selectable (clicking a suggestion selects it), using `NcRichContenteditable`'s built-in Tribute.js integration — no bespoke dropdown implementation SHALL be added.

> @e2e exclude Sidebar-tab composer wired through a mocked upstream component in jsdom; no standalone browser surface distinct from CnObjectSidebar's existing e2e coverage (ADR-008 / Playwright-UI-only convention).

#### Scenario: Typing "@" opens the suggestion dropdown

- **GIVEN** the note composer is empty and focused
- **WHEN** the user types `@ru`
- **THEN** `fetchMentionSuggestions` SHALL be invoked with search text `ru`
- **AND** the returned suggestions SHALL be shown in an open dropdown

#### Scenario: Keyboard selection inserts a mention token

- **GIVEN** the suggestion dropdown is open with at least one suggestion
- **WHEN** the user presses ArrowDown then Enter
- **THEN** the composer's text SHALL contain the serialized mention token for the selected suggestion's id
- **AND** the dropdown SHALL close

#### Scenario: Mouse selection inserts a mention token

- **GIVEN** the suggestion dropdown is open with at least one suggestion
- **WHEN** the user clicks a suggestion
- **THEN** the composer's text SHALL contain the serialized mention token for the clicked suggestion's id
- **AND** the dropdown SHALL close

#### Scenario: Escape closes the dropdown without inserting

- **GIVEN** the suggestion dropdown is open
- **WHEN** the user presses Escape
- **THEN** the dropdown SHALL close
- **AND** the composer's text SHALL be unchanged

### Requirement: Mentions SHALL persist using the canonical `@userId` / `@"user id"` token convention

Mentioned users SHALL be encoded inline in the note's plain-text `message` field as `@<id>` when `<id>` matches `^[A-Za-z0-9_.'-]+$`, or as `@"<id>"` otherwise (the same convention used by Nextcloud Comments/Talk). No new schema field SHALL be introduced. `src/utils/mentions.js` SHALL export pure, side-effect-free helpers implementing this format:

- `parseMentions(text)` → ordered array of `{ type: 'text', value }` and `{ type: 'mention', id, raw }` segments whose concatenation reconstructs `text` exactly.
- `extractMentionedIds(text)` → array of unique mentioned ids, first-appearance order.
- `serializeMentionToken(id)` → the canonical token string for `id`.
- `detectMentionQuery(text, cursorPosition)` → `{ query, start } | null` describing an in-progress `@partial` immediately before the caret, or `null` when the caret is not inside one.
- `insertMentionToken(text, cursorPosition, id)` → `{ text, cursor }` with the in-progress `@partial` at the caret replaced by the serialized token plus a trailing space.

A mention token SHALL only be recognized when the `@` is preceded by the start of the string or whitespace (never mid-word), so that email-like substrings (e.g. `contact john@example.com`) are never misparsed as mentions. Trailing punctuation immediately after an unquoted id (e.g. `@jan!`, `@jan,`) SHALL terminate the id at the punctuation, leaving the punctuation as plain text. A literal `@` that must not be parsed as a mention SHALL be escaped by ensuring no whitespace/start-of-string precedes it (e.g. a leading backslash: `\@notauser` is never preceded by whitespace at the `@` position, so it is left as plain text).

#### Scenario: Parsing a simple unquoted mention

- **GIVEN** the text `"hi @jan.doe, please review"`
- **WHEN** `parseMentions` is called
- **THEN** it SHALL return a mention segment with `id: 'jan.doe'`
- **AND** the trailing `", please review"` SHALL remain plain text

#### Scenario: Parsing a quoted mention with a space in the id

- **GIVEN** the text `'ping @"jan de vries" today'`
- **WHEN** `parseMentions` is called
- **THEN** it SHALL return a mention segment with `id: 'jan de vries'`

#### Scenario: Email-like text is not parsed as a mention

- **GIVEN** the text `"contact john@example.com for details"`
- **WHEN** `parseMentions` is called
- **THEN** no mention segment SHALL be produced
- **AND** the full string SHALL round-trip as a single text segment

#### Scenario: Escaped `@` is not parsed as a mention

- **GIVEN** the text `"literal \\@notauser here"`
- **WHEN** `parseMentions` is called
- **THEN** no mention segment SHALL be produced for `notauser`

#### Scenario: Adjacent punctuation terminates the mention id

- **GIVEN** the text `"thanks @jan!"`
- **WHEN** `parseMentions` is called
- **THEN** it SHALL return a mention segment with `id: 'jan'`
- **AND** the trailing `"!"` SHALL remain plain text

#### Scenario: Round-trip through serialize + parse

- **GIVEN** an id containing a space (`"jan de vries"`)
- **WHEN** `serializeMentionToken(id)` output is embedded in a larger string and passed through `parseMentions`
- **THEN** the recovered mention id SHALL equal the original id exactly

#### Scenario: Extracting unique mentioned ids preserves first-appearance order

- **GIVEN** the text `"@jan @piet @jan again"`
- **WHEN** `extractMentionedIds` is called
- **THEN** it SHALL return `['jan', 'piet']`

### Requirement: Inserting a mention from the composer uses the pure insertion helper

`insertMentionToken(text, cursorPosition, id)` SHALL locate the in-progress `@partial` ending at `cursorPosition` (as reported by `detectMentionQuery`) and replace it with `serializeMentionToken(id)` followed by a single space, returning the new full text and the caret position immediately after the inserted space.

#### Scenario: Inserting a mention mid-sentence keeps the surrounding text intact

- **GIVEN** the text `"hi @ja can you check"` with the caret positioned immediately after `"@ja"`
- **WHEN** `insertMentionToken` is called with id `"jan.doe"`
- **THEN** the result text SHALL be `"hi @jan.doe can you check"`
- **AND** the returned caret position SHALL point immediately after the inserted space

### Requirement: Existing notes render mentions as chips, degrading gracefully for unknown users

`CnNotesTab` SHALL render each note's `message` through `parseMentions` and render `mention` segments as a `.cn-notes-tab__mention` chip showing the resolved display name, styled with `var(--color-primary-element-light)` background and `var(--color-main-text)` foreground — no hardcoded color values. Display names SHALL be resolved via `searchNextcloudUsers(id)` (exact id match), cached per component instance so each mentioned id is looked up at most once. When no exact match is found (unknown or deleted user), the chip SHALL render the raw id with a `.cn-notes-tab__mention--unknown` modifier class (reduced opacity) instead of crashing, hiding the mention, or blocking the note from rendering.

> @e2e exclude Presentational rendering asserted by jest component tests under `tests/components/`; no independent browser flow beyond CnObjectSidebar's existing e2e coverage.

#### Scenario: A mention to a known user renders a chip with their display name

- **GIVEN** a note with `message: "please review @jan.doe"` and `searchNextcloudUsers('jan.doe')` resolving to `{ id: 'jan.doe', label: 'Jan de Vries' }`
- **WHEN** the note is rendered in the list
- **THEN** a `.cn-notes-tab__mention` chip showing `"Jan de Vries"` SHALL be rendered
- **AND** it SHALL NOT carry the `--unknown` modifier

#### Scenario: A mention to an unresolvable user degrades gracefully

- **GIVEN** a note with `message: "cc @ghost-user"` and `searchNextcloudUsers('ghost-user')` resolving to no exact match
- **WHEN** the note is rendered in the list
- **THEN** a `.cn-notes-tab__mention.cn-notes-tab__mention--unknown` chip showing the raw id `"ghost-user"` SHALL be rendered
- **AND** the rest of the note text SHALL still render normally

### Requirement: `CnNotesTab` emits a `mention` event on save; nc-vue does not dispatch notifications

After successfully creating or editing a note whose text contains at least one mention, `CnNotesTab` SHALL emit a `mention` event with payload `{ objectId, register, schema, noteId, mentionedUserIds }`, where `mentionedUserIds` is the result of `extractMentionedIds` on the saved text and `noteId` is the created/edited note's id. No event SHALL be emitted when a saved note contains no mentions.

`CnNotesTab` (and `nextcloud-vue` generally) SHALL NOT perform any server-side notification dispatch — it is a frontend component library with no backend of its own. Consuming apps (e.g. OpenRegister, Dossiq) are responsible for listening to the `mention` event — either directly on `CnNotesTab` or via `CnObjectSidebar`'s passthrough — and translating it into actual Nextcloud notifications from their own PHP backend (for example, calling `INotificationManager::createNotification()` from the controller that persists the note, keyed off the same `mentionedUserIds`). Building that server-side dispatch is explicitly out of scope for this change.

`CnObjectSidebar` SHALL forward the event unchanged via `@mention="$emit('mention', $event)"` on its `CnNotesTab` usage, so consumers mounting the full sidebar receive it without needing the `#tab-notes` slot override.

#### Scenario: Saving a note with a mention emits the event

- **GIVEN** the composer contains `"please review @jan.doe"`
- **WHEN** the note is saved and the backend responds with the created note (`id: 'note-1'`)
- **THEN** `CnNotesTab` SHALL emit `mention` with `{ objectId, register, schema, noteId: 'note-1', mentionedUserIds: ['jan.doe'] }`

#### Scenario: Saving a note with no mention emits no event

- **GIVEN** the composer contains `"just a plain note"`
- **WHEN** the note is saved successfully
- **THEN** `CnNotesTab` SHALL NOT emit a `mention` event

#### Scenario: Editing a note to add a mention emits the event with the edited note's id

- **GIVEN** an existing note `note-2` with no mentions is being edited
- **WHEN** the user adds `"@piet"` to the text and saves
- **THEN** `CnNotesTab` SHALL emit `mention` with `{ ..., noteId: 'note-2', mentionedUserIds: ['piet'] }`

