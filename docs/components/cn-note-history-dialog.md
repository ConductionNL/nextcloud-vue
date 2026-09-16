# CnNoteHistoryDialog

Lists what a note said before it was edited (NcDialog-based, read only).

A note is a Nextcloud comment, and an edit overwrites its message. OpenRegister
keeps every prior text beside the comment and serves them from a versions
endpoint, so this dialog shows the texts a note has lost, newest first, each
with the author it was attributed to and the person who replaced it.

Opened by `CnNotesTab`, the notes tab of
[`CnObjectSidebar`](./cn-object-sidebar.md), from its "Show earlier versions"
action, which appears only on a note whose `versionCount` is above zero. Lives
in its own file under `src/dialogs/` per the modal-isolation rule.

The list is read only on purpose. Restoring an old text is a new note that
references the old one, not a rewrite of the record.

## Import

```js
import { CnNoteHistoryDialog } from '@conduction/nextcloud-vue'
```

## Usage

```vue
<CnNoteHistoryDialog
  v-if="historyNoteId"
  :open="true"
  :note-id="historyNoteId"
  :object-id="objectId"
  register="zaken"
  schema="zaak"
  @update:open="historyNoteId = null" />
```

## What it fetches

On open, once per open:

```
GET /apps/openregister/api/objects/{register}/{schema}/{objectId}/notes/{noteId}/versions
```

It answers `{ results, total }` with the versions newest first. Each row carries
`message`, `author`, `authorDisplayName`, `editedBy`, `editedByDisplayName` and
`editedAt`.

A failed read renders an error state, never an empty list. An empty list would
read as "never edited", which is a different statement and the wrong one for a
reader to believe.

The endpoint ships with OpenRegister 2.1.32 and later. Against an older backend
the request answers 404 and the dialog shows its error state.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | `false` | Whether the dialog is open. Opening triggers the fetch. |
| `noteId` | `string\|number` | `''` | The note whose earlier versions are listed. |
| `objectId` | `string` | required | The object the note hangs on. |
| `register` | `string` | `''` | OpenRegister register slug. |
| `schema` | `string` | `''` | OpenRegister schema slug. |
| `apiBase` | `string` | `'/apps/openregister/api'` | Base URL for the OpenRegister API. |
| `dialogName` | `string` | `'Earlier versions'` | Dialog header title. |
| `loadingLabel` | `string` | `'Loading earlier versions…'` | Shown while the versions are being fetched. |
| `emptyLabel` | `string` | `'Nobody has changed this note'` | Shown when the note was never edited. |
| `errorLabel` | `string` | `'The earlier versions could not be loaded'` | Shown when the read failed. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:open` | `boolean` | The dialog should close. |
