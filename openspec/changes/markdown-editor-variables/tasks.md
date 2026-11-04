# Tasks: markdown-editor-variables

### Task 1: A markdown editor can offer variables to insert
- **spec_ref**: `openspec/changes/markdown-editor-variables/specs/markdown-editor-variables/spec.md#requirement-a-markdown-editor-can-offer-variables-to-insert`
- **files**: `src/components/CnMarkdownEditor/CnMarkdownEditor.vue`, `docs/components/cn-markdown-editor.md`, `l10n/en.json`, `l10n/nl.json`
- [x] Implement: `variables`, `insertVariableText`, insert menu
- [x] Test: `tests/components/CnMarkdownEditorVariables.spec.js`

### Task 2: A markdown editor names unknown variables
- **spec_ref**: `openspec/changes/markdown-editor-variables/specs/markdown-editor-variables/spec.md#requirement-a-markdown-editor-names-unknown-variables`
- **files**: `src/components/CnMarkdownEditor/CnMarkdownEditor.vue`, `src/utils/templateVariables.js`, `l10n/en.json`, `l10n/nl.json`
- [x] Implement: `unknownVariableText`, event `unknown-variables`
- [x] Test: `tests/components/CnMarkdownEditorVariables.spec.js`
