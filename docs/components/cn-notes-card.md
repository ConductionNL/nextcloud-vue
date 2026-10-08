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
| `deleteLabel` | String | | `'Delete note'` | Accessible label for the delete button |

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

## Reference (auto-generated)

The tables below are generated from the SFC source via `vue-docgen-cli`. They reflect what's actually in [`CnNotesCard.vue`](https://github.com/ConductionNL/nextcloud-vue/blob/beta/src/components/CnNotesCard/CnNotesCard.vue) and update automatically whenever the component changes.

<GeneratedRef />
