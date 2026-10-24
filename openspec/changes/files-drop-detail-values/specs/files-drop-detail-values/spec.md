## ADDED Requirements

### Requirement: the drop detail line can name the record

CnFilesBrowser MUST fill each `dropDetailValues` entry into `dropDetail` as `{name}`, and MUST leave the line out while a value is empty or an unresolved `@` token.

#### Scenario: DqZaakDocumentenSlepen
- GIVEN `dropDetail: "{count} files go to case {case}, as a document still to be assessed."` and the case number 2026-0082
- WHEN three files are dragged over the list
- THEN the line reads "3 bestanden komen bij zaak 2026-0082, als nog te beoordelen document."
