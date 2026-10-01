# Design: notes-replies-group-mentions-and-images

Read at nextcloud-vue development `c8aa85863` and openregister development
`555af72`.

## What is there

- `CnNotesTab` (`src/components/CnObjectSidebar/CnNotesTab.vue`) fetches
  `GET {apiBase}/objects/{register}/{schema}/{id}/notes` (`:256`), posts
  `{ message }` to create (`:376`), renders each note as text with mention
  chips from `parseMentions`, and emits `mention` with
  `mentionedUserIds` after a save (`emitMentionEvent`, `:360`).
- The composer is `NcRichContenteditable` with `fetchMentionSuggestions`
  (`:281`), which calls `searchNextcloudUsers` over
  `core/autocomplete/get` with `shareTypes[]=0`, users only
  (`src/utils/userAutocomplete.js:64-80`).
- `CnNotesCard` (`src/components/CnNotesCard/CnNotesCard.vue`) is the
  detail-page card over the same endpoint (`:264`, `:284`) with its own
  composer and rendering.
- `src/utils/mentions.js` serialises `@id` and `@"id with spaces"`.
- OpenRegister `NotesController` wraps Nextcloud Comments; `create()`
  takes `message` and `visibility` (`lib/Controller/NotesController.php:172-209`),
  no parent. Object files: `POST .../{id}/files` and `.../filesMultipart`
  (`appinfo/routes.php:1456`, `:1461`).

## Decisions

### D1. One composer and one note renderer

`CnNoteComposer` (the rich input, suggestions, paste and drop) and
`CnNoteCard` (one note: author, time, body, actions) are shared by
`CnNotesTab` and `CnNotesCard`. Today the two carry their own copies,
which is how one of them would get replies and the other not.

### D2. Replies are one level deep

Reply opens the composer under the note, and the new note is created
with `parentId`. The list shows top-level notes in time order and each
note's replies under it, oldest first. A reply to a reply attaches to
the same top-level note, as Nextcloud Deck does. When the parent is more
than five notes up, the reply shows a one-line quote of it.

Reply appears only when the notes response carries a `parentId` key on
its items (null or not). That is the capability signal: an OpenRegister
that ignores the parent would otherwise save a reply as a loose note and
the reader would never know.

Rejected: deep nesting. Three levels of indent in a 360-pixel sidebar is
a column of single words.

### D3. Groups in the suggestions, in the Nextcloud format

`fetchMentionSuggestions` asks `core/autocomplete/get` with
`shareTypes[]=0&shareTypes[]=1`. A group is stored as
`@"group/<gid>"`, the format Nextcloud Comments and Talk use, rendered as
a group chip with the group's display name. `extractMentionedIds` splits
users and groups; the `mention` event carries `mentionedUserIds` and
`mentionedGroupIds`. Expanding a group to its members and notifying them
stays with whoever dispatches mention notifications.

### D4. Pasted images become record files

A pasted or dropped image (`image/*` only) is uploaded to the record's
files through `filesMultipart`, and the composer inserts
`![<name>](<file url>)` at the caret. The note renderer shows an image
only when its URL is a file of this same record served by OpenRegister;
any other image URL renders as a link. The rest of the note stays plain
text with mention chips: no markdown headings, no HTML, so a note cannot
restyle the page.

Rejected: embedding the image as a `data:` URL in the note. Nextcloud
Comments caps a message at 1000 characters by default.

## Files

- `src/components/CnNoteComposer/`: new, shared composer.
- `src/components/CnNoteCard/CnNoteCard.vue`: body with images, Reply.
- `src/components/CnObjectSidebar/CnNotesTab.vue`,
  `src/components/CnNotesCard/CnNotesCard.vue`: use both, thread the list.
- `src/utils/mentions.js`: group tokens.
- `src/utils/userAutocomplete.js`: groups in the search.

## Security

Image URLs are allow-listed to the record's own OpenRegister file URLs
and rendered with `safeHref`. Upload goes through OpenRegister, which
checks type and content. Group suggestions come from Nextcloud's own
autocomplete, which applies the instance's sharing restrictions.
