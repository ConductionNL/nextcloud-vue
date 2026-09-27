# notes-mentions-autocomplete Delta: notes-replies-group-mentions-and-images

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [notes-replies-group-mentions-and-images](../../)

## Purpose

Notes on a record take replies, mention groups and carry pasted images,
in the sidebar tab and on the detail-page card alike. Rows
`pg-record-comments` (buildiq matrix), `col-threaded-comments`,
`col-group-mention` and `col-comment-images` (planninq matrix).

## ADDED Requirements

### Requirement: A note can be answered, and the answer stays with it

When the notes response carries a `parentId` key on its notes,
`CnNotesTab` and `CnNotesCard` SHALL offer Reply on each note, SHALL
create the reply with the note's id as `parentId`, and SHALL show replies
under their top-level note, one level deep, oldest first. A reply to a
reply SHALL attach to the same top-level note. When the response carries
no `parentId` key, Reply SHALL NOT be shown.

#### Scenario: Three colleagues, two threads

- GIVEN a task with notes from Anna and Bram
- WHEN Chris replies to Anna's note
- THEN Chris's reply shows under Anna's note, not at the end of the list

#### Scenario: An OpenRegister without replies

- GIVEN notes returned without a `parentId` key
- WHEN the tab renders
- THEN no Reply action is shown

### Requirement: The composer mentions groups

The composer's `@` suggestions SHALL include Nextcloud groups beside
users. A group mention SHALL be stored as `@"group/<gid>"` and shown as a
group chip with the group's display name. The `mention` event SHALL carry
`mentionedGroupIds` beside `mentionedUserIds`.

#### Scenario: The planning team is asked

- GIVEN a group "Planning" with four members
- WHEN a coordinator types "@Plan", picks the group and saves the note
- THEN the note shows a Planning chip
- AND the `mention` event carries `mentionedGroupIds: ["planning"]`

### Requirement: A pasted image becomes part of the note

An image pasted or dropped into the composer SHALL be uploaded to the
record's files and inserted in the note as an image reference. A note
SHALL render an image only when its URL is a file of the same record
served by OpenRegister; any other image URL SHALL render as a link. The
rest of the note SHALL render as plain text with mention chips.

#### Scenario: A screenshot of the error

- GIVEN a tester on a task's Comments tab
- WHEN she pastes a screenshot into the composer and saves
- THEN the note shows the screenshot
- AND the screenshot is listed among the task's files

#### Scenario: A foreign image is not loaded

- GIVEN a note whose text contains an image reference to another site
- WHEN it renders
- THEN it shows a link, and no request goes to that site
