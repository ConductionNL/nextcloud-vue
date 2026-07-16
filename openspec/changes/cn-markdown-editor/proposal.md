# CnMarkdownEditor — markdown editor with live preview

## Why

The pipelinq + opencatalogi triages flagged knowledge-base article editors (`ArticleEditorView`, `PageDetailPageView`) as customs because no lib widget provides a markdown surface with live preview.

## What

`src/components/CnMarkdownEditor/CnMarkdownEditor.vue` (~360 LOC). Textarea + live HTML preview driven by `cnRenderMarkdown`. Formatting toolbar with 8 default tools (bold, italic, h1, h2, link, code, list, quote) — selection-wrap or line-prefix modes. Keyboard shortcuts (Ctrl+B / Ctrl+I). Three layout modes (`edit` / `split` / `preview`) with mode-cycle button. Public `insertAtCaret(text)` method.

## Non-goals

- TipTap WYSIWYG mode — tracked as follow-up. Component contract is forward-compatible; adding `mode: 'wysiwyg'` later won't break consumers.
- Image upload via paste / drag-drop — consumer-driven via `insertAtCaret`.
- Real-time collaborative editing.

## References

- [nextcloud-vue#286](https://github.com/ConductionNL/nextcloud-vue/issues/286).
- pipelinq `ArticleEditorView`, opencatalogi `PageDetailPageView`.
