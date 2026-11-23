# Proposal: markdown-editor-variables

## Why

Board PtMailsjablonen edits a mail template whose text may use only the variables the template allows, and says "Onbekende variabele: {besluit}. Niet opgeslagen."
when the text names another one. `CnMarkdownEditor` has no way to offer the variables or to check them. `utils/fillTemplate` already fills `{name}` tokens.

## What changes

- `CnMarkdownEditor` gets `variables`, `unknownVariableText`, `insertVariableText` and the event `unknown-variables`.
- An insert menu writes `{name}` at the caret; an alert under the editor names every unknown variable.
- `utils/templateVariables` gets `templateVariables` and `unknownTemplateVariables`.
- Without `variables` the editor behaves as before.

Item 11 of the fleet component gap list (decisions 281, 320).
