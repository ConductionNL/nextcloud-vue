# notice-scoped-to-the-record Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [notice-scoped-to-the-record](../../)

## Purpose

A notice on a record's page can show while that record's related rows match a filter, and name the first of them.

## ADDED Requirements

### Requirement: A banner's source may be scoped to the page's record

On a detail page, a banner whose `visibleWhen.source.filter` holds `@objectId` or `@object.<field>` SHALL resolve those
tokens against the page's record, SHALL ask again when the record becomes known, and SHALL keep the first row of the
query as its subject also when the condition compares the count (`@total`), so `{subject.<field>}` fills the text.

#### Scenario: DqZaak "Advies gevraagd"

- **GIVEN** a case page with a banner whose source is the open advice requests with `case: "@objectId"`, shown while
  their count is above 0, with the text "to {subject.advisor}"
- **AND** one open request to Mobiliteit en verkeer on this case
- **THEN** the query asks for `case=<the case's id>` and the banner reads "to Mobiliteit en verkeer"
