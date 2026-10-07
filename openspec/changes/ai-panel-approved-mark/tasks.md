# Tasks: ai-panel-approved-mark

> The drawing half of thematiq `assistant-approved-mark` (ADR-032 `kind: code`).
> Closes nextcloud-vue#1298.

## Implementation tasks

### Task 1: Cached read of the mark
- **spec_ref**: `openspec/changes/ai-panel-approved-mark/specs/ai-chat-companion-widget/spec.md#requirement-the-assistant-panel-draws-the-approved-mark-from-thematiq`
- **files**: `src/utils/assistantMark.js`, `src/utils/index.js`, `tests/utils/assistantMark.spec.js`
- **acceptance_criteria**:
  - `getAssistantMark()` returns a promise of `{enabled, label, organisation, logo}` or `null`
  - No request when `isAppInstalled('thematiq')` is false
  - One request per page load, shared by every caller
  - Any failure or malformed answer resolves to `null`
  - JSDoc on the export
- [ ] Implement
- [ ] Test

### Task 2: Footer row in CnAiChatPanel
- **spec_ref**: `openspec/changes/ai-panel-approved-mark/specs/ai-chat-companion-widget/spec.md#requirement-the-mark-is-readable-and-announced-once`
- **files**: `src/components/CnAiCompanion/CnAiChatPanel.vue`, `src/components/CnAiCompanion/CnAiChatPanel.md`, `tests/components/CnAiChatPanel.spec.js`
- **acceptance_criteria**:
  - Footer row `cn-ai-chat-window__mark` with `role="note"`, in the chat and history views
  - Image with the contract's `alt`, max 24px high; label rendered as received
  - No row in the DOM for off, absent, failed or malformed answers
  - Label colours `--color-main-text` on `--color-main-background`
  - `npm test` and `npm run build` pass
- [ ] Implement
- [ ] Test
