# markdown-editor-variables Delta: markdown-editor-variables

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [markdown-editor-variables](../../)

## Purpose

A user writes a template with the variables it allows, inserts them without typing the braces, and hears at once when the text names one that does not exist.

## ADDED Requirements

### Requirement: A markdown editor can offer variables to insert

With `variables`, `CnMarkdownEditor` SHALL offer a menu named "Insert variable" (or `insertVariableText`) with one entry per variable, by its label.
Picking an entry SHALL write `{name}` at the caret. The menu SHALL be hidden in preview mode and when the editor is disabled. Without `variables` there SHALL be no menu.

#### Scenario: Insert at the caret

- **GIVEN** the variable `naam` and the text `Dear ` with the caret at the end
- **WHEN** the user picks Name from the menu
- **THEN** the text becomes `Dear {naam}`

### Requirement: A markdown editor names unknown variables

With `variables`, the editor SHALL read every `{name}` and `{name|format:arg}` in the text. A name that is not listed, and has no listed start before a dot,
SHALL be named under the editor as an alert, in `unknownVariableText` with `{names}` replaced, or "Unknown variable: {names}." by default. The editor SHALL
emit `unknown-variables` with the names whenever they change, and an empty list once all are known again. Without `variables` it SHALL check nothing.

#### Scenario: Board PtMailsjablonen "Onbekende variabele: {besluit}. Niet opgeslagen."

- **GIVEN** the variable `naam` and `unknownVariableText` "Onbekende variabele: {names}. Niet opgeslagen."
- **WHEN** the user types `{besluit}`
- **THEN** the alert reads "Onbekende variabele: {besluit}. Niet opgeslagen."
- **AND** `unknown-variables` is emitted with `besluit`

#### Scenario: A dotted variable under a listed start

- **GIVEN** the variable `case`
- **THEN** `{case.number}` is known and `{cases.x}` is unknown
