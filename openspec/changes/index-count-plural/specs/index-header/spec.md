# index-header Delta: index-count-plural

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [index-count-plural](../../)

## Purpose

The count line under an index title reads right for one record and for many.

## ADDED Requirements

### Requirement: The count line takes a singular and a plural form

`countSubtitle` SHALL accept `{ singular, plural }`, two i18n keys. The page SHALL pick the form by the collection's
total through the app's plural translation when CnAppRoot provides an app id, and SHALL take the singular for a total
of one otherwise. `{total}` SHALL be replaced by the total and, under the board look, `{shown}` by the rows on the
page. A string `countSubtitle` SHALL behave as before, and `countText` SHALL still win under the board look.

#### Scenario: One invoice

- **GIVEN** `countSubtitle` is `{ "singular": "{total} invoice", "plural": "{total} invoices" }` and the app's Dutch catalogue holds both forms
- **WHEN** a Dutch reader opens a list of one invoice
- **THEN** the line reads "1 factuur"

#### Scenario: Twelve invoices

- **GIVEN** the same page
- **WHEN** the list holds twelve invoices
- **THEN** the line reads "12 facturen"
