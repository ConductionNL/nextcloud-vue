# files-browser-second-line-size-type Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [files-browser-second-line-size-type](../../)

## Purpose

A file's second line can say what kind of file it is and how big.

## ADDED Requirements

### Requirement: A file's second line can name its type and size

CnFilesBrowser's `nameSecondary` template SHALL read `size`, the file's size formatted as the size column shows it,
and `type`: "PDF" for a PDF, "Word", "Excel" or "PowerPoint" for those office types, "Email" for a mail and "Image" for
a picture (translated), else the file's extension in capitals, and '' without one.

#### Scenario: DqZaakDocumenten

- **GIVEN** a case's documents with `nameSecondary: "{type} · {size} · {modified|date}"`
- **THEN** "Advies verlichting fietspad.pdf" shows "PDF · 1,2 MB · 14 januari 2026" under its name
