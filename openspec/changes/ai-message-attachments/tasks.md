# Tasks: ai-message-attachments

> Library half of hermiq `chat-attachments-and-images`. `kind: code`.
> Checkbox budget: 3 tasks x 2 = 6 unindented `- [ ]` lines (cap 20).

## Implementation tasks

### Task 1: Keep attachments and notices on messages
- **spec_ref**: `openspec/changes/ai-message-attachments/specs/ai-chat-companion-widget/spec.md#requirement-an-answer-shows-the-files-and-notices-it-carries`
- **files**: `src/composables/useAiChatStream.js`, `tests/composables/useAiChatStreamAttachments.spec.js`
- **acceptance_criteria**:
  - The user message keeps its attachments; `final` and the JSON fallback keep `attachments` and `attachmentNotices` when they are arrays
  - Verify: jest over an SSE fixture and a JSON fixture; mutation check: dropping the copy in `finalise` reddens the test
- [x] Implement
- [x] Test

### Task 2: Render them
- **spec_ref**: `openspec/changes/ai-message-attachments/specs/ai-chat-companion-widget/spec.md#requirement-a-sent-message-shows-its-attachments`
- **files**: `src/components/CnAiCompanion/CnAiMessageList.vue`, `tests/components/CnAiMessageListAttachments.spec.js`
- **acceptance_criteria**:
  - Chips under the question; thumbnails for images with a file id; chips for the rest; notices above the answer
  - Verify: jest; `npm run check:smoke`; `npm run check:a11y`
- [x] Implement
- [x] Test

### Task 3: Choose from Files
- **spec_ref**: `openspec/changes/ai-message-attachments/specs/ai-chat-companion-widget/spec.md#requirement-files-can-be-chosen-from-nextcloud-files`
- **files**: `src/components/CnAiCompanion/CnAiInput.vue`, `tests/components/CnAiInputFilePicker.spec.js`, `docs/components/cn-ai-input.md`
- **acceptance_criteria**:
  - The attach menu offers both; picked files become chips with `fileId` and are sent without an upload
  - Verify: jest with a mocked file picker; `npm run check:docs`, `npm run check:docs-fresh`
- [x] Implement
- [x] Test
