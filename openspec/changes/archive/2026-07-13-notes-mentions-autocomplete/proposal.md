---
kind: code
---

## Why

`CnNotesTab` (`src/components/CnObjectSidebar/CnNotesTab.vue`) is a flat add/edit/delete note list — a plain `<textarea>` composer and plain-text rendering of `note.message`. There is no way to address a note at a specific colleague. Every competing case-management product in the fleet's market (and every general-purpose collaboration tool) treats `@mention` with autocomplete as table stakes for a notes/comments feature; its absence is a collaboration gap across the whole fleet, since every Conduction app that uses `CnObjectSidebar` (OpenRegister, OpenCatalogi, Procest, Pipelinq, LaunchPad) inherits whichever notes tab ships here. Per ADR-Leaf-First, this is built once in `nextcloud-vue` rather than duplicated per app.

### What already exists at HEAD (verified before designing)

- **Persistence**: notes are OpenRegister objects, not Nextcloud comments. `CnNotesTab` calls a REST sub-resource on the OpenRegister objects API: `GET/POST {apiBase}/objects/{register}/{schema}/{objectId}/notes`, `PUT/DELETE .../notes/{id}`. The note body is stored as a plain string field (`message`/`content`). There is no NC Comments integration and no server-side mention parsing today.
- **Upstream already ships a mention-capable rich input.** `@nextcloud/vue` is pinned at `8.39.0` (`package.json`, `node_modules/@nextcloud/vue/package.json`). `NcRichContenteditable` already wires a Tribute.js-based `@` autocomplete: an `autoComplete(search, callback)` prop function supplies suggestions, results render via the built-in `NcAutoCompleteResult`/`NcMentionBubble` sub-components, and it is fully keyboard-navigable (arrow keys, Enter, Escape) and mouse-selectable out of the box. It stores an inserted mention as plain text using the exact same token convention as Nextcloud Comments/Talk: `@userId` for ids with no space/slash/quote, or `@"user id"` when the id contains characters that would be ambiguous unquoted (`src/richEditor` mixin: `genSelectTemplate`, `USERID_REGEX`).
- **A tested, reusable OCS autocomplete helper already exists.** `src/utils/userAutocomplete.js` exports `searchNextcloudUsers(query)` and `resolveNextcloudUser(uid)`, backed by the core `core/autocomplete/get` OCS endpoint (available to every authenticated user), with fail-soft error handling. It is currently only consumed by `CnFormDialog`'s user-picker field.

**Decision: reuse, not rebuild.** The composer swaps its plain `<textarea>` for `NcRichContenteditable`, wired to `searchNextcloudUsers` for suggestions. This gets keyboard/mouse-navigable autocomplete, the canonical NC storage token format, and NC-consistent UX for free — no bespoke dropdown, no new fetch/debounce plumbing, no new token format to invent. What upstream does *not* provide is (a) rendering *already-stored* mention tokens as chips inside a static list row (`NcRichContenteditable` only does this for its own live-edited content) and (b) any notion of "who got mentioned on save" for a consuming app to act on. Those two gaps are this change's actual scope.

## What Changes

- **Composer**: `CnNotesTab`'s note textarea becomes an `NcRichContenteditable` (`multiline`) bound to `searchNextcloudUsers` via its `autoComplete` prop. Typing `@` opens the native upstream suggestion dropdown; arrow keys / Enter / Escape / mouse click all work via the upstream component, unmodified.
- **Storage format**: mentions persist inside the note's plain-text `message` field using the Nextcloud Comments/Talk convention — `@userId` (unquoted) when the id contains only `[A-Za-z0-9_.'-]`, `@"user id"` (quoted) otherwise. No new field, no schema change; deterministic and reversible via the new parser.
- **New pure helpers** (`src/utils/mentions.js`, not part of the public barrel — same internal-utility convention as `userAutocomplete.js`):
  - `parseMentions(text)` — splits text into `{ type: 'text' | 'mention', ... }` segments.
  - `extractMentionedIds(text)` — unique mentioned user ids, in first-appearance order.
  - `serializeMentionToken(id)` — id → canonical `@id` / `@"id"` token.
  - `detectMentionQuery(text, cursorPosition)` — is the caret currently inside an in-progress `@partial` (used to gate the autocomplete lookup)?
  - `insertMentionToken(text, cursorPosition, id)` — replaces the in-progress `@partial` at the caret with the serialized token, returning the new text and caret position.
- **Rendering**: past notes render their `message` through `parseMentions`; mention segments render as chips (`.cn-notes-tab__mention`) with the resolved display name, `var(--color-primary-element-light)` background and `var(--color-main-text)` foreground (no hardcoded colors). Unknown/deleted users (lookup finds no exact-id match) render a visually muted chip showing the raw id instead of crashing or showing nothing.
- **Notification hook**: `CnNotesTab` emits a `mention` event — `{ objectId, register, schema, noteId, mentionedUserIds }` — after a note with at least one mention is successfully created or edited. `CnObjectSidebar` passes the event through unchanged (`@mention="$emit('mention', $event)"`) for consumers that mount the sidebar rather than the tab directly. **nc-vue does not dispatch server-side notifications** — it is a frontend library; the event is the full extent of its responsibility. Consuming apps translate the event into actual Nextcloud notifications from their own PHP backend (e.g. an `INotificationManager` call triggered from the note-creation controller, keyed off the same `mentionedUserIds`), which is out of scope for this change and documented as a consumer responsibility in the spec.
- No breaking changes: `CnNotesTab`'s existing props/events/slots are untouched; the new `mention` event and `NcRichContenteditable` swap are additive. `NcObjectSidebar`'s new `@mention` passthrough is additive.

## Impact

- Affected components: `src/components/CnObjectSidebar/CnNotesTab.vue`, `src/components/CnObjectSidebar/CnObjectSidebar.vue`.
- Affected utilities: new `src/utils/mentions.js`.
- Affected docs: `docs/components/cn-notes-tab.md` (regenerated partial), `docs/components/cn-object-sidebar.md` (new event row).
- Consumers (OpenRegister, OpenCatalogi, Procest, Pipelinq, LaunchPad) get the feature automatically once they update to the published `nextcloud-vue` version; wiring server-side notification dispatch from the `mention` event is a follow-up per consuming app (filed as a follow-up issue, not built here).
