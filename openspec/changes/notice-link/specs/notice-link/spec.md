# notice-link Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [notice-link](../../)

## ADDED Requirements

### Requirement: A notice can link to a record

A notice with `link` SHALL draw a link under its text to the named route with its tokens resolved from the page's
record, labelled by the resolved label or else `fallbackLabel`, and SHALL draw no link while a param is unresolved.

#### Scenario: dossiq

- **GIVEN** a task whose flow run waits on it, with `objectUuid` `c-1` and subject "Kapvergunning Lindelaan"
- **THEN** the notice links "Kapvergunning Lindelaan" to the CaseDetail route of `c-1`
