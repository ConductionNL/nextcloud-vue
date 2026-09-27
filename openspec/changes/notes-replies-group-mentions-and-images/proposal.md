---
kind: code
depends_on: []
---

# Proposal: notes-replies-group-mentions-and-images

## Why

Notes on a record are where colleagues talk about it: the sidebar Notes
tab (`CnNotesTab`) and the notes card on a detail page (`CnNotesCard`).
They are a flat list of plain text. You cannot answer one note in
particular, so a discussion with three people turns into guessing who
answered whom. You can mention a colleague, not the team that has to
act. And a screenshot, the fastest way to show what is wrong, cannot be
pasted in.

## Rows

| matrix | row | name | own rating | built |
|---|---|---|---|---|
| buildiq | `pg-record-comments` | Discuss a record with colleagues in a comment thread on its page. | partial | built |
| planninq | `col-threaded-comments` | Reply to a specific comment so a discussion stays threaded. | no | built |
| planninq | `col-group-mention` | Mention a whole team or group in a comment so every member is notified. | no | built |
| planninq | `col-comment-images` | Paste or drop an image straight into a task description or a comment. | no | built |

`pg-record-comments` built evidence: notes on the object through the
Notes tab, "not threaded replies". The three planninq rows read the same
component: "a single NcListItem per note with no reply or thread",
"CnNotesTab suggests users, not groups or teams", and "has no paste or
drop handler for images". The planninq state `built` refers to the flat
list; each capability itself is missing.

Demand:

- `pg-record-comments`: competitor-derived,
  https://github.com/nocobase/nocobase/blob/v2.2.18/packages/plugins/@nocobase/plugin-block-comment/src/client-v2/models/RecordCommentsBlockModel.tsx#L557
- `col-threaded-comments`: feature request, https://jira.atlassian.com/browse/JRASERVER-3406
- `col-group-mention`: feature request, https://jira.atlassian.com/browse/JRASERVER-28225
- `col-comment-images`: feature request, https://github.com/nextcloud/deck/issues/533,
  also https://github.com/orgs/kanboard/discussions/5545

## Competitor evidence, quoted from the matrices

- NocoBase, yes (`pg-record-comments`, buildiq matrix): "comments block
  with quote-reply", https://github.com/nocobase/nocobase (v2.2.18)
- Microsoft Power Apps, yes (`pg-record-comments`): "collaborate by
  mentioning coworkers in Notes on the timeline of a row",
  https://learn.microsoft.com/en-us/power-apps/user/use-@mentions
- Nextcloud Deck, yes (`col-threaded-comments`, planninq matrix):
  "CardSidebarTabComments.vue:14-16 reply to a comment ...
  CommentService.php:97 create with replyTo", https://github.com/nextcloud/deck (v1.19.0)
- OpenProject, yes (`col-group-mention`): "create_from_model_service.rb:41
  matches group mentions and :281 notifies the group's members",
  https://github.com/opf/openproject (v17.8.0)
- OpenProject, yes (`col-comment-images`): "the CKEditor field uploads
  pasted or dropped images as attachments of the resource, used for
  descriptions and comments"
- Plane, yes (`col-comment-images`): "drop.ts:26 handlePaste and :54
  handleDrop insert images ... uploadFile in the comment editor",
  https://github.com/makeplane/plane (v1.4.2)

## What changes

- **Reply.** Each note gets Reply. A reply carries its parent and is
  shown under it, one level deep, with the parent quoted when the parent
  is far up the list.
- **Group mentions.** The composer's `@` suggestions include groups. A
  group mention is stored in the Nextcloud mention format and shown as a
  group chip, and the `mention` event carries the group ids.
- **Images.** An image pasted or dropped into the composer is uploaded to
  the record's files and shown in the note. Notes render their images;
  nothing else in a note becomes HTML.
- Both `CnNotesTab` and `CnNotesCard` get all three, from one shared
  notes composer and note renderer.

## Affected projects

- `nextcloud-vue`: `CnNotesTab`, `CnNotesCard`, `CnNoteCard`,
  `src/utils/mentions.js`, `src/utils/userAutocomplete.js`, a shared
  `CnNoteComposer`.
- `openregister`: `parentId` on the notes API (see cross-project
  dependencies).
- Consumers: planninq (task comments), buildiq (detail pages), dossiq,
  pipelinq, every app with the Notes tab.

## Backward compatibility

A note without a parent renders as today. A user mention keeps its token
format. The `mention` event keeps `mentionedUserIds` and adds
`mentionedGroupIds`. Images need the host to have the files plugin or
the object files endpoint; without it, paste does nothing new.

## Cross-project dependencies

- OpenRegister stores notes as Nextcloud comments and returns a flat list;
  its original design says threading "can add in V2 without API changes
  (just add `parentId` to responses)" (archived `object-interactions`
  design). `NotesController::create()` does not read a parent today
  (`lib/Controller/NotesController.php:172`). The OpenRegister half: accept
  `parentId` on create and return `parentId` on every note. Listed for the
  openregister lane. Until notes carry a `parentId` key, Reply is not
  shown.
- Notifying the members of a mentioned group is whoever dispatches mention
  notifications. By the `notes-mentions-autocomplete` spec that is the
  consuming app ("nc-vue does not dispatch notifications"). Planninq does
  not listen to the event yet (row `tsk-mentions`, planninq's half).
