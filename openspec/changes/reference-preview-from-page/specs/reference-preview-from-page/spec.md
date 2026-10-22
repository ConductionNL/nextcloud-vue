# reference-preview-from-page Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [reference-preview-from-page](../../)

## Purpose

`pages[].referencePreview` turns on reference previews on that page.

## ADDED Requirements

### Requirement: A page can turn on reference previews

When the current page declares `referencePreview: true`:

- CnPageRenderer SHALL provide `cnReferencePreview` with `enabled: true` and `targetFor(routeName)`, the register and
  schema of the detail page that route opens (null for any other route);
- a CnRecordListWidget row that opens a detail page SHALL draw its title as a CnReferencePreview of that record, which
  opens the record when activated, and the row SHALL NOT be a link around it;
- a record the reader may not read SHALL load nothing into the card.

Without the page key, rows SHALL stay plain links.

#### Scenario: A related case read without leaving

- **GIVEN** the case page with `referencePreview: true` and a related-cases list whose rows open the case page
- **WHEN** the handler hovers or focuses a related case's title
- **THEN** a summary card of that case shows, and the address does not change
