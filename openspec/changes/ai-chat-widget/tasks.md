# Tasks: ai-chat-widget

### Task 1: The companion and its window can be embedded
- **spec_ref**: `openspec/changes/ai-chat-widget/specs/ai-companion/spec.md#requirement-the-ai-chat-can-be-placed-in-the-page`
- **files**: `src/components/CnAiCompanion/CnAiCompanion.vue`, `src/components/CnAiCompanion/CnAiChatPanel.vue`
- [x] Implement: `embedded` on both
- [x] Test: `tests/components/CnAiChatWidgetEmbedded.spec.js`

### Task 2: The `ai-chat` widget
- **spec_ref**: `openspec/changes/ai-chat-widget/specs/ai-companion/spec.md#requirement-the-ai-chat-can-be-placed-in-the-page`
- **files**: `src/components/CnAiCompanion/CnAiChatWidget.vue`, `src/components/CnWidgetGrid/registerDashboardWidgets.js`, `src/utils/libraryWidgetKeys.js`
- [x] Implement: register `ai-chat`, export the component, document it
- [x] Test: `tests/components/CnAiChatWidgetEmbedded.spec.js`, `tests/utils/libraryWidgetKeys.spec.js`
