---
kind: code
depends_on: []
---

# Proposal: ai-message-attachments

## Why

The AI companion on every Nextcloud page lets a person attach a file to
a question. Once sent, the file is gone from view: the message list shows
the text of the question and the text of the answer, nothing else. An
answer that comes with a generated image, or with a notice that the model
could not read the PDF, arrives at the library and is dropped, because
`finalise()` keeps only the text and the tool calls. And the paperclip
only uploads from the device; a document already in Files has to be
downloaded and uploaded again.

## Rows

No gap row in this lane's list names this. The sibling change that asks
for it:

- hermiq `chat-attachments-and-images`, rows `ch-attach`,
  `dm-image-chat`, `ch-image-gen` and `dm-native-pdf` (hermiq matrix). Its
  proposal, out of scope: "Rendering attachments and generated images
  inside the floating companion. The companion's message list is
  nextcloud-vue's (`CnAiMessageList`), and it needs its own change there.
  hermiq returns the data in the `final` frame so that change has
  something to render." Its design D2: "The companion keeps its
  upload-only control until nextcloud-vue adds a picker; that is its
  change". Its design D4 and D8: the `final` frame carries `attachments` on
  the assistant turn and `attachmentNotices`.

## What changes

- A sent message keeps its attachments, and the message list shows them
  as chips under the question.
- An answer keeps the `attachments` and `attachmentNotices` its `final`
  frame carries. Images show as thumbnails linked to the file in Files;
  other files as chips; notices as a line above the answer.
- The paperclip offers Choose from Files next to Upload from device, and
  sends the chosen files by id.

## Affected projects

- `nextcloud-vue`: `useAiChatStream`, `CnAiMessageList`, `CnAiInput`.
- Consumers: every app that mounts the companion through `CnAppRoot`;
  hermiq is the backend that sends the new fields.

## Backward compatibility

A backend that sends no `attachments` or `attachmentNotices` on `final`
renders exactly as today. The send body keeps its `attachments` shape
(`{ path, name }`); a file chosen from Files adds `fileId`, which hermiq's
design reads and older backends ignore.

## Out of scope

- A "Create an image" action in the companion. hermiq adds one on its own
  Chat page; the companion can follow once hermiq's image route ships.
- Rendering PDFs inside the panel. A PDF answer is a chip that opens the
  file.
