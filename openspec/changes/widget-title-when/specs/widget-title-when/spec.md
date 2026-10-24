# widget-title-when Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [widget-title-when](../../)

## ADDED Requirements

### Requirement: A widget title can depend on the record

A detail page SHALL resolve a widget definition's `titleWhen` (`[{ when?, text }]`) into its plain `title` before the
definition reaches any reader: the widget host's card, a leaf card, a tabs widget's labels and panel headings (through
`availableWidgets`), the side column and the header card. The first entry whose `when` holds against the record and its
`@context` rows SHALL set the title; an entry without `when` always holds. While the record or its context rows are on
their way, or when no entry holds, the definition SHALL keep its own `title`. A definition without `titleWhen` SHALL be
handed on unchanged, and a resolved one SHALL stay the same object while its title does not change.

#### Scenario: a case type that reviews its documents

- **GIVEN** the Files widget with `title: "Files"` and `titleWhen: [{ when: documentReview enabled, text: "Documents for this request" }, { text: "" }]`
- **WHEN** the case type reviews its documents
- **THEN** the card and every other reader see "Documents for this request"

#### Scenario: a case type that does not

- **WHEN** the case type does not review its documents
- **THEN** the title is empty and the card draws no title row

### Requirement: An empty title is a card without a title row

A widget host SHALL draw no title row for a widget whose `title` is the empty string, for a leaf card as for a host
card, unless the layout asks for one. A widget without a `title` keeps its fallback (a leaf card names its provider).

#### Scenario: DqDocumentenBeheer

- **GIVEN** the Files widget resolved to `title: ""`
- **THEN** the files browser stands in its card with no "Bestanden" title row
