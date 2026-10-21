---
kind: code
---

# Proposal: block-list-editor

## Summary

pipelinq builds a mail out of typed blocks (heading, text, image, button, footer) in its own MailBlockEditor: a palette
that adds a block, a list that reorders by drag and by move up and down, a panel with the picked block's fields, a footer
that always stays last and whose text always ends with the address and unsubscribe tokens. CnFormBuilder, portaliq page
builders and learniq lesson builders need the same shell.

CnBlockListEditor is that shell, named by what it does. The block types, their fields and the tokens are the app's
configuration; the editor knows none of them.

## Scope

- `src/components/CnBlockListEditor/` (new): palette, list with drag, arrow keys on a handle and move buttons, a polite
  live region, per-type property fields, `pinnedLast`, `maxBlocks`, `fixedTokens` on a textarea field.
- `docs/components/cn-block-list-editor.md`.
- Not in scope: rebasing CnFormBuilder's shell on it. CnFormBuilder edits a JSON schema (properties, required, field
  config), so moving it is a change of its own, not a small one.
