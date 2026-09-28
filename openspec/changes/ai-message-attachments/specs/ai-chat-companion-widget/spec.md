# ai-chat-companion-widget Delta: ai-message-attachments

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [ai-message-attachments](../../)

## Purpose

The companion shows what was attached to a question and what an answer
brought back, and takes files from Nextcloud Files. Answers hermiq
`chat-attachments-and-images` (rows `ch-attach`, `dm-image-chat`,
`ch-image-gen`, `dm-native-pdf`).

## ADDED Requirements

### Requirement: A sent message shows its attachments

`useAiChatStream` SHALL keep the attachments of a sent message on that
message, and `CnAiMessageList` SHALL show them as chips under the
question.

#### Scenario: The quote stays visible with the question

- GIVEN a case handler who attaches "offerte-dakrenovatie-2026.pdf" and asks about the delivery term
- WHEN the question is sent
- THEN the question shows a chip for the PDF

### Requirement: An answer shows the files and notices it carries

When the `final` frame carries `attachments` or `attachmentNotices`, the
assistant message SHALL keep them. An image attachment with a file id
SHALL render as a Nextcloud preview thumbnail linked to the file, other
attachments as chips, and each notice as a line above the answer. A
frame without them SHALL render as before.

#### Scenario: A generated image in the answer

- GIVEN hermiq answers "Create an image of a green roof" with a `final` frame carrying a PNG attachment with a file id
- WHEN the answer arrives
- THEN the answer shows the image as a thumbnail
- AND clicking it opens the file in Files

#### Scenario: The model could not read the PDF

- GIVEN a `final` frame with the notice "This model does not read PDFs directly. hermiq used the text of offerte-2026.pdf instead."
- WHEN the answer renders
- THEN that sentence shows above the answer

### Requirement: Files can be chosen from Nextcloud Files

The companion's attach control SHALL offer Choose from Files beside
Upload from device, SHALL open the Nextcloud file picker for several
files, and SHALL send the chosen files by id without uploading them.

#### Scenario: A document already in Files

- GIVEN a report in the user's Files
- WHEN she chooses Choose from Files, picks it and asks a question
- THEN the send body carries the report's file id and no upload request is made
