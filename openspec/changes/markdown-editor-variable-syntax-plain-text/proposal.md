# Proposal: markdown-editor-variable-syntax-plain-text

## Why

A mail template editor writes its variables as `{{name}}` and its body is plain text, with a preview that marks known
variables and unresolved ones. `CnMarkdownEditor` inserts and checks `{name}` only and always treats the text as Markdown,
so such an editor stays hand-built.

## What changes

- `variableSyntax`: how a variable is written (`{name}` by default, `{{name}}`, `[[name]]`); the insert menu, the
  unknown-variable check and its message follow it.
- `plainText`: no formatting tools, no Markdown keys, no WYSIWYG, and a preview that escapes the text, keeps its line
  breaks and marks each variable as known or unknown.

Backward compatible: both default to the current behaviour. Covers round 4 item 4 (EmailTemplateAdmin) of the build
programme (decision 371).
