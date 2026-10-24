## ADDED Requirements

### Requirement: a file's second line is a list of fields

CnFilesBrowser MUST accept `secondLine`, a list of fields filled per file and joined with " · ", leaving out a field without a value, or a list of variants `{ when, fields }` of which the first whose `when` is `true` or absent is used. It MUST take precedence over `nameSecondary`, and CnFilesTab MUST forward it.

#### Scenario: DqZaakDocumenten
- GIVEN `secondLine: ["type", "size", "modified|date"]` and a 1,2 MB PDF changed on 14 January
- THEN its second line reads "PDF · 1,2 MB · 14 jan"-style text with the three parts

#### Scenario: DqDocumentenBeheer
- GIVEN variants whose review variant's `when` is false and a default `["senderName", "modified|date"]`, a file sent by "Inwoner"
- THEN its second line starts with "Inwoner · "

### Requirement: widget props can read the detail page's context records

A detail page widget's `props` MUST resolve `@context.<name>.<path>` from the records the page reads beside the record; while they are not read the token stays as written.

#### Scenario: case type flag
- GIVEN the case type with `documentReview.enabled: true` as context `caseType`
- THEN `"@context.caseType.documentReview.enabled"` resolves to `true`
