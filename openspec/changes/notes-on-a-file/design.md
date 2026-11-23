# Design: notes-on-a-file

Read at nextcloud-vue development `3e606bf10`.

## What is there

- `CnNotesCard` (`src/components/CnNotesCard/CnNotesCard.vue`) takes
  `registerId`, `schemaId`, `objectId` and `apiBase`, fetches
  `{apiBase}/objects/{registerId}/{schemaId}/{objectId}/notes`, posts
  `{ message }` to add and sends `DELETE .../notes/{id}` to delete
  (`:264`, `:284`, `:309`). It shows up to `maxDisplay` notes with Show
  all, the author through `CnUserActionMenu`, and delete for your own.
- OpenRegister's object notes are Nextcloud comments with object type
  `openregister`. File comments are Nextcloud comments with object type
  `files`, served at `/remote.php/dav/comments/files/{fileId}`, where
  Nextcloud checks that the user can reach the file.

## Decisions

### D1. One card, two sources

`CnNotesCard` gains `fileId`. When it is set and the object props are
not, the card uses the file source; otherwise the object source, as
today. The two sources return the same note shape (`id`, `message`,
`actorId`, `actorDisplayName`, `creationDateTime`, `isOwn`), so the
template does not branch.

Rejected: a separate `CnFileNotesCard`. Two cards drift, which is the
reason filinq gave for not writing its own.

### D2. The file source speaks Nextcloud's comments DAV

- List: `REPORT /remote.php/dav/comments/files/{fileId}` with an
  `oc:filter-comments` body (`limit`, `offset`), parsed for
  `oc:id`, `oc:message`, `oc:actorId`, `oc:actorDisplayName`,
  `oc:creationDateTime` and `oc:isUnread`.
- Add: `POST /remote.php/dav/comments/files/{fileId}` with
  `{ actorType: "users", verb: "comment", message }`.
- Delete: `DELETE /remote.php/dav/comments/files/{fileId}/{commentId}`,
  offered on your own notes only.

These are the calls the Files sidebar's comments tab makes. Nextcloud
checks access on each, and its comments app sends the mention
notifications for object type `files`, so the card dispatches nothing.

### D3. The composable is usable alone

`useFileComments(fileId)` exposes `list()`, `add(message)`,
`remove(id)` and `count()`. A host that only needs the number for a list
row can call `count()`; a host listing many files asks for
`oc:comments-count` in its own `PROPFIND` instead, which is what filinq
does.

## Files

- `src/components/CnNotesCard/CnNotesCard.vue`: `fileId`, source choice.
- `src/composables/useFileComments.js`: new.
- `src/composables/index.js`, `src/index.js`: export it.

## Security

Every call goes to Nextcloud's own endpoint with the user's session; the
card adds no authority. A message renders as text with mention chips, as
object notes do.
