# index-page Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [index-scope-presentation](../../)

## Purpose

One index page shows each kind of record the way its board draws it, from configuration.

## ADDED Requirements

### Requirement: A preset or a scope sets the list's presentation

A query preset SHALL be able to set `title`, `quickFilters`, `columns`, `cardFields`, `countText`, `searchPlaceholder`,
`footerNote`, `defaultSort`, `viewSwitch`, `addLabel`, `headerButtons`, `breadcrumb`, `headerMeta` and `afterList`. A
folder scope, from its folder entry or its row's `x-index`, SHALL be able to set the same keys other than `columns` and
`defaultSort` (which its list layout resolves). A scope's value SHALL win over the page's, including a value a preset set.

#### Scenario: Klachten as a scope

- **GIVEN** an index page "Alle zaken" whose folder "Klachten" sets `title`, `countText: "{total} klachten"`,
  `addLabel: "Klacht registreren"`, a breadcrumb and a note
- **WHEN** the reader selects "Klachten"
- **THEN** the page reads "Klachten", "7 klachten", the add button reads "Klacht registreren" and the breadcrumb reads
  "Alle zaken / Klachten"
- **AND** selecting another folder without those keys shows the page's own values again

### Requirement: An index page can draw widgets after its list

CnIndexPage SHALL draw `afterList` widget definitions as titled cards after the list, in the listed order, resolved like
`statRow` entries. A preset or a scope SHALL be able to set its own `afterList`.

#### Scenario: A chart under the complaints table

- **GIVEN** a scope with `afterList: [{ id: "per-onderwerp", type: "chart", title: "Klachten per onderwerp" }]`
- **THEN** a card "Klachten per onderwerp" follows the list

### Requirement: The query that chose a preset is not a removable filter

The route query pairs in the matched preset's `match` SHALL be passed to the page as `fixedFilters`, and an active filter
with exactly that key and value SHALL show no removable chip.

#### Scenario: Organisaties

- **GIVEN** a Clients page opened as `?type=organization`, matching a preset with `match: { type: "organization" }`
- **THEN** no "Soort klant: organization" chip shows
- **AND** another active filter still shows its chip
