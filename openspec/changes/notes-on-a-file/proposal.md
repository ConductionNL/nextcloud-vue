---
kind: code
depends_on: []
---

# Proposal: notes-on-a-file

## Why

`CnNotesCard` shows notes on an OpenRegister record. A document that is
only a file, with no record behind it, has nowhere to hold a note for a
colleague. Nextcloud already has one: file comments, shown in the Files
sidebar, found by search, and with a notification for a colleague named
with @. The card cannot read them.

## Rows

No gap row in this lane's list names this. The sibling change that asks
for it:

- filinq `work-document-notes`, matrix row `wk-notes` ("Add a note to a
  document for colleagues", filinq matrix). Its design D2: "The panel is
  `CnNotesCard` with a file as its source, once nextcloud-vue accepts one.
  The card then calls the comments endpoint from the browser." Its task
  1.1: "File the nextcloud-vue half (a file as `CnNotesCard` source over
  `/remote.php/dav/comments/files/{fileId}`)". Its REQ-WDN-001: "A note is
  a Nextcloud comment on the file".

## What changes

- `CnNotesCard` takes a file as its source: `fileId` instead of a
  register, schema and object. It then reads, adds and deletes Nextcloud
  file comments through the comments DAV endpoint.
- Everything else the card does stays the same: the list, the count,
  Show all, delete your own, mentions.
- A small `useFileComments` composable holds the DAV calls, so a host can
  show a comment count without mounting the card.

## Affected projects

- `nextcloud-vue`: `CnNotesCard`, a new `useFileComments`.
- Consumers: filinq (My documents, dossier documents, intake), and any
  app that shows a plain file.

## Backward compatibility

The object source stays the default. A card given `registerId`,
`schemaId` and `objectId` works exactly as before. The file source is
used only when `fileId` is set and the object props are not.

## Out of scope

- Replies on file comments. `notes-replies-group-mentions-and-images`
  specifies replies for object notes; file comments follow once the same
  card renders both.
- Filinq's panels and its `PROPFIND` count. Those are filinq's.
