# widget-subtitle-by-condition Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [widget-subtitle-by-condition](../../)

## Purpose

A card's subtitle on a detail page can depend on the record and the records the page reads beside it.

## ADDED Requirements

### Requirement: A card subtitle can depend on the record

On a detail page, a widget's `subtitle` MAY be `[{ when, text }]`. The card SHALL show the `text` of the first entry
whose `when` holds for the record with its `@context` rows (an entry without `when` always holds), and SHALL show no
subtitle when none holds or while the context rows are on their way. A string subtitle is unchanged.

#### Scenario: DqZaakDocumenten

- **GIVEN** the Files card with `subtitle: [{ when: { field: "@context.caseType.documentReview.enabled", op: "eq", value: true }, text: "..." }]`
- **WHEN** the case's type reviews its documents
- **THEN** the line shows under the card title
- **AND** on a case type that does not, no subtitle shows
