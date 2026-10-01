# Design: ai-message-attachments

Read at nextcloud-vue development `3e606bf10` and hermiq development
`5ac16d3`.

## What is there

- `useAiChatStream.send()` pushes `{ role: 'user', content }` (no
  attachments) and sends `body.attachments` when given
  (`src/composables/useAiChatStream.js:297-349`).
- On `final`, the stream copies `fullText` and `pendingApprovals` and
  calls `finalise(messageId, conversationUuid)` (`:176-188`), which pushes
  `{ id, role: 'assistant', content, toolCalls }` (`:211-219`). Any other
  field on the frame is dropped.
- `CnAiMessageList` renders the content with `NcRichText` markdown and a
  collapsible block per tool call.
- `CnAiInput` has one paperclip that opens a hidden file input
  (`openFilePicker`, `src/components/CnAiCompanion/CnAiInput.vue:975`),
  uploads to the attachments endpoint and shows chips until sent.

## Decisions

### D1. Messages carry what was sent and what came back

`send()` stores the attachments on the user message. `finalise()` stores
`parsed.attachments` and `parsed.attachmentNotices` on the assistant
message when they are arrays; anything else is ignored. The JSON
fallback path, which synthesises a `final` event, does the same.

### D2. Images are thumbnails from Nextcloud, not bytes in the stream

An attachment with an `image/*` type and a `fileId` renders as a
thumbnail from `/core/preview?fileId={id}&x=256&y=256&a=1`, linked to
`/f/{id}` in a new tab. Other attachments render as a chip with name,
type and size, linked the same way. An attachment without a `fileId`
renders as a chip with its name only. Nothing is base64 in the stream,
which is hermiq's design as well.

### D3. Notices are said, not hidden

Each entry of `attachmentNotices` renders as one line above the answer in
`--color-text-maxcontrast`, so "This model does not read PDFs directly.
hermiq used the text of offerte-2026.pdf instead." is read before the
answer that depends on it.

### D4. Choose from Files

The paperclip becomes a small menu: Upload from device (today's path)
and Choose from Files, which opens `@nextcloud/dialogs`'
`getFilePickerBuilder` for several files. Chosen files become chips with
`{ fileId, path, name }` and go on the send body without an upload.

## Files

- `src/composables/useAiChatStream.js`: D1.
- `src/components/CnAiCompanion/CnAiMessageList.vue`: D2, D3.
- `src/components/CnAiCompanion/CnAiInput.vue`: D4.

## Accessibility

A thumbnail has the file name as its text alternative; notices are part
of the message's live region.
