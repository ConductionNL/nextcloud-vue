# redaction-editor Delta: redaction-editor

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [redaction-editor](../../)

## Purpose

One redaction editor for every app that publishes or anonymises documents.

## ADDED Requirements

### Requirement: A reviewer redacts a record's documents

CnRedactionEditor SHALL list the record's documents from `urls.list` and SHALL open them one at a time. For a document without a redacted copy it SHALL detect the passages through `urls.detect`, mark each in the text, and list each with its type label, its grounds and a verdict: agreed, adjust or do not redact. A locked passage SHALL start agreed and SHALL NOT take another verdict. A reviewer SHALL be able to add a passage by hand. Record redaction SHALL be enabled only when every passage has a verdict and at least one is to be redacted. It SHALL post the agreed and adjusted passages to `urls.check` before asking `urls.redact` for the copy. A refusal SHALL be shown in the server's words with the upload still offered. A document with a recorded copy SHALL open with its passages agreed and SHALL NOT be detected again.

#### Scenario: Redacting a request

- **GIVEN** a request with the detected passages "Henk Visser" and a locked citizen service number
- **WHEN** the reviewer agrees to "Henk Visser" and records the redaction
- **THEN** the editor posts both passages to the check, then asks for the redacted copy, and says only that copy will be published

#### Scenario: Not every passage judged

- **GIVEN** a passage without a verdict
- **THEN** Record redaction stays disabled
