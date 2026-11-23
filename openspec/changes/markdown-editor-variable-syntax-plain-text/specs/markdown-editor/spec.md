# markdown-editor Delta: markdown-editor-variable-syntax-plain-text

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [markdown-editor-variable-syntax-plain-text](../../)

## Purpose

`CnMarkdownEditor` can edit a plain-text template whose variables are written `{{name}}`.

## ADDED Requirements

### Requirement: Variables can be written in another syntax

`variableSyntax` SHALL say how a variable is written, `name` standing for its name, with marks on both sides; it SHALL
default to `{name}`. The insert menu SHALL insert and describe a variable in that syntax, the unknown-variable check SHALL
read variables in that syntax (allowing spaces inside its marks), and the unknown-variable message SHALL name them in it.

#### Scenario: Mail template variables

- **GIVEN** `variableSyntax` "{{name}}" and the variables `naam` and `case`
- **WHEN** the user inserts `naam`
- **THEN** the text holds `{{naam}}`
- **WHEN** the text holds `{{besluit}}`
- **THEN** the editor says "Unknown variable: {{besluit}}." and emits `["besluit"]`

### Requirement: A plain-text mode without Markdown

With `plainText` the editor SHALL show no formatting tools, SHALL NOT turn keys into Markdown, SHALL edit instead of
opening WYSIWYG and SHALL leave WYSIWYG out of the layout switch. Its preview SHALL show the text escaped, with its line
breaks, and each variable marked, as unknown when `variables` are given and it is not among them.

#### Scenario: Preview of a template body

- **GIVEN** `plainText`, `variableSyntax` "{{name}}", the variable `naam` and the text `<b>Dear</b> {{naam}}` and
  `{{besluit}}` on the next line
- **THEN** the preview shows the markup as text, `{{naam}}` marked known, a line break, and `{{besluit}}` marked unknown
