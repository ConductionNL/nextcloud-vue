# facts-widget Delta: abstract-facts-widget

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [abstract-facts-widget](../../)

## Purpose

One configurable card of facts about one object, so an app declares its side
cards in the manifest instead of shipping a component per card.

## ADDED Requirements

### Requirement: A facts widget draws configured fields of the current object

The `facts` widget type SHALL render `content.fields[]` in order, reading each
`path` off the current detail-page object. An entry with a `label` and no `as`
SHALL be a label/value row; consecutive rows SHALL form one two-column list
with the label in `--color-text-maxcontrast`. `as: "title"` SHALL draw a bold
line that links when it has a `route`; `as: "line"` SHALL draw a muted line,
joining `parts` with `separator` (default " · ") and dropping empty parts;
`as: "pill"` SHALL draw a CnStatusBadge in `variant` / `variantMap[raw]`
(an unknown variant falls back to `default`). `format` SHALL be `text`,
`date`, `date-long` or `list`; `map` SHALL turn a raw value into a label.
Labels, map values, the link label and the empty text SHALL go through the
host translate function.

#### Scenario: A portal's domain card

- **GIVEN** a portal with two `domains[].hostname` and `locales: ["nl"]`
- **AND** fields `{ path: "domains", label: "Domein", format: "list", itemPath: "hostname" }` and `{ path: "locales", label: "Taal" }`
- **WHEN** the widget renders
- **THEN** it shows one list with "Domein: zuiddrecht.nl, www.zuiddrecht.nl" and "Taal: nl"

#### Scenario: An empty value drops its entry

- **GIVEN** a field whose value is empty and `hideEmpty` not set to false
- **WHEN** the widget renders
- **THEN** the entry is not drawn, and with no entry left the widget shows `emptyText`

### Requirement: A facts widget can read one other object

With `content.source` `{ register, schema, id }` the widget SHALL read that
OpenRegister object, `id` resolved through the shared filter tokens; with
`{ url }` it SHALL resolve tokens inside the url as an endpoint source does.
While a token stays unresolved it SHALL send no request and show the empty
text. A failed read SHALL show one quiet line, not the error text. Routes and
the link SHALL take `@source.<field>`; one whose token does not resolve SHALL
be left out.

#### Scenario: The case a task belongs to

- **GIVEN** a task with `case: "c-9"` and source `{ register: "dossiq", schema: "case", id: "@object.case" }`
- **WHEN** the widget renders
- **THEN** it reads `/apps/openregister/api/objects/dossiq/case/c-9`
- **AND** a title with route `{ name: "CaseDetail", params: { id: "@source.id" } }` links to that case

#### Scenario: No case yet

- **GIVEN** a task without `case`
- **WHEN** the widget renders
- **THEN** no request is sent and the empty text shows

### Requirement: A facts widget gets the titled card on a detail page

`facts` SHALL be a content-only catalog type: on a card surface the detail
page host SHALL wrap it in the titled widget card with the manifest title and
icon; in a tab panel it SHALL render bare. It SHALL have no config form.

#### Scenario: A side card

- **GIVEN** a detail page side widget `{ type: "facts", title: "Thema" }`
- **WHEN** the page renders
- **THEN** the card carries the title "Thema" and the facts below it
