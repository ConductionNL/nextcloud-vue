# index-header Delta: index-header-open-form

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [index-header-open-form](../../)

## Purpose

A header action on an index page can open the create form as a dialog, as it can on a detail page.

## ADDED Requirements

### Requirement: An index header action can open the create form

A `headerActions` entry of `type: "open-form"` or `type: "open-modal"` without a `handler` SHALL run through the
library's action buttons when it is clicked from a header button, the header Actions menu or the actions bar: an
`open-form` entry opens the schema-driven create form for its `register` and `schema`, an `open-modal` entry opens its
registered modal. After the form saves, the list SHALL reload. The page SHALL still emit `header-action`. Entries with a
`handler` and entries of any other type SHALL behave as before.

#### Scenario: A header button opens the create form

- **GIVEN** `headerActions` holds `{ "id": "new-invoice", "label": "New invoice", "type": "open-form", "register": "shillinq", "schema": "invoice" }` and `headerButtons` holds `{ "action": "new-invoice", "variant": "primary", "label": "New invoice" }`
- **WHEN** the person clicks "New invoice"
- **THEN** the create form for the invoice schema opens over the list
- **AND** after it saves, the list reloads

#### Scenario: An entry with a handler keeps its handler

- **GIVEN** an `open-form` entry that also names a `handler`
- **WHEN** it is clicked
- **THEN** the handler runs and no form opens
