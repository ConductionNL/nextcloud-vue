import Playground from '@site/src/components/Playground'
import GeneratedRef from './_generated/CnNotesCard.md'

# CnNotesCard

Inline notes widget for detail pages. Fetches notes from the OpenRegister API, shows the most recent entries (up to `maxDisplay`), and includes an add-note form. Author names are wrapped with `CnUserActionMenu` for quick communication. Own notes show a delete button on hover.

**Wraps**: CnDetailCard, CnUserActionMenu

## Try it

<Playground component="CnNotesCard" />

## Usage

```vue
<CnNotesCard
  register-id="uuid-register"
  schema-id="uuid-schema"
  object-id="uuid-object"
  @note-added="refreshSidebar"
  @note-deleted="refreshSidebar"
  @show-all="openSidebarNotesTab" />
```

Pass pre-translated labels when your app handles i18n:

```vue
<CnNotesCard
  register-id="reg"
  schema-id="schema"
  object-id="obj"
  :title-label="t('myapp', 'Notes')"
  :add-note-label="t('myapp', 'Add note')"
  :no-notes-label="t('myapp', 'No notes yet')"
  :show-all-label="t('myapp', 'Show all')" />
```

### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `registerId` | String | | `''` | OpenRegister register UUID (object source) |
| `schemaId` | String | | `''` | OpenRegister schema UUID (object source) |
| `objectId` | String | | `''` | Object UUID (object source) |
| `fileId` | String \| Number | | `null` | Show the notes of a plain Nextcloud file instead of an object: the file's id. Used when no `objectId` is given; the notes are the file's comments. |
| `apiBase` | String | | `'/apps/openregister/api'` | Base URL for OpenRegister API calls |
| `maxDisplay` | Number | | `5` | Maximum number of notes to show before the "Show all" footer link appears |
| `collapsible` | Boolean | | `false` | Whether the card supports collapse/expand |
| `chromeless` | Boolean | | `false` | Render the notes body without the surrounding `CnDetailCard`. Set it where the surface already supplies the card and the title, such as a tab panel whose open tab names the panel; leaving the card on there nests a card inside a card and shows the label twice. |
| `titleLabel` | String | | `'Notes'` | Card title |
| `addNoteLabel` | String | | `'Add note'` | Submit button label |
| `addNotePlaceholder` | String | | `'Write a note...'` | Textarea placeholder |
| `noNotesLabel` | String | | `'No notes yet'` | Empty state text |
| `showAllLabel` | String | | `'Show all'` | Footer link label |
| `unavailableLabel` | String | | `'Notes are not available for this file'` | Text shown instead of the notes when Nextcloud refuses a file's comments (no access). |
| `showVisibility` | Boolean | | `false` | Show a chip on every note reading Internal or Public. A note without a value reads as internal (OpenRegister's own read-time fallback). Not used for a file source. |
| `canSetVisibility` | Boolean | | `false` | Whether the caller may set visibility on this object: the answer the server gives for `update` on it. The host passes it; the card never infers it from the current user. When true the add-note form offers a Public switch (default internal) and each note a Make public / Make internal toggle. |
| `publicSwitchLabel` | String | | `'Public (visible to the customer)'` | Label of the add-note switch. |
| `makePublicLabel` | String | | `'Make public'` | Label of the toggle on an internal note. |
| `makeInternalLabel` | String | | `'Make internal'` | Label of the toggle on a public note. |
| `replyLabel` | String | | `'Reply'` | Label of the Reply button, shown only when the backend supports replies |
| `deleteLabel` | String | | `'Delete note'` | Accessible label for the delete button |

### Replies, group mentions and images

The add-note form is the shared [CnNoteComposer](./cn-note-composer.md) and each note's text is rendered by [CnNoteBody](./cn-note-body.md), the same as in the sidebar Notes tab.

- **Replies.** When the notes response carries a `parentId` key on its notes (null or not), each note offers **Reply** (its accessible name says whom it answers). The reply is created with the note's id as `parentId` and shows under its top-level note, one level deep, oldest first. A reply to a reply attaches to the same top-level note, and a reply many places below its parent carries a one-line quote of it. Without the `parentId` key (an OpenRegister that does not store parents yet) no Reply is shown, because it would be saved as a loose note. Not offered for a file source.
- **Group mentions.** `@` suggests groups beside users; a group is stored as `@"group/<gid>"` and shown as a group chip.
- **Images.** An image pasted or dropped into the form is uploaded to the record's files and shown in the note. Only files of the same record render as images; any other image URL renders as a link.

### A file as the source

A document that is only a file, with no record behind it, can still hold notes. Pass `fileId` instead of the object props:

```vue
<CnNotesCard :file-id="file.fileid" />
```

The card then lists, adds and deletes the file's Nextcloud comments through `/remote.php/dav/comments/files/{fileId}`, the calls the Files sidebar's comments tab makes. They are the same notes: a note added here shows in the Files sidebar and the other way round. Nextcloud checks access on each call, so a colleague who cannot open the file sees no notes and no add field (the card shows `unavailableLabel`). Mention notifications for file comments come from Nextcloud's comments app; the card dispatches nothing. With an `objectId`, the card behaves as before, even when `fileId` is also set.

To show only a count (for a list row), use [`useFileComments`](../utilities/composables/use-file-comments.md).

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `note-added` | — | Emitted after a note has been successfully created |
| `note-deleted` | — | Emitted after a note has been successfully deleted |
| `show-all` | — | Emitted when the "Show all" footer link is clicked |
| `mention` | `{ objectId, register, schema, noteId, mentionedUserIds, mentionedGroupIds? }` | After a note that mentions someone was added. `mentionedGroupIds` is present only when a group (`@"group/<gid>"`) is mentioned. nc-vue notifies nobody; the listener does, and expands a group to its members. |
| `visibility-changed` | `{ id, visibility }` | After a note's visibility was changed |

## Reference (auto-generated)

The tables below are generated from the SFC source via `vue-docgen-cli`. They reflect what's actually in [`CnNotesCard.vue`](https://github.com/ConductionNL/nextcloud-vue/blob/beta/src/components/CnNotesCard/CnNotesCard.vue) and update automatically whenever the component changes.

<GeneratedRef />

### Internal or public

With `showVisibility` every note carries a chip, and the label (not the colour) says which side of the counter it is on. With `canSetVisibility` the add-note form carries the choice before the note is written (default internal) and a note can be flipped afterwards. Creating a note and changing its visibility both go out through one method (`writeNote`): `POST .../notes` with `{ message, visibility }` and `PATCH .../notes/{id}` with `{ visibility }`. A host that passes neither prop renders the card as before and sends `{ message }` only. The server still decides: a refused write shows an error and leaves the note as it was.
