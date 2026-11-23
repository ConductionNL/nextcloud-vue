# template-select Delta

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: A form starts from a named template

CnTemplateSelect SHALL list OpenRegister record templates of `schema`, or the rows of `url` with `params` mapped by `mapOption`, and emit the chosen one as `apply` (null when cleared). It SHALL hide itself while the list is empty or unreadable, say a failed read in a toast, re-read when its source changes, and never show a list from an earlier source.

#### Scenario: The library cannot be read

- **WHEN** the template endpoint fails
- **THEN** no select is drawn and the reader is told "Could not read the templates"
