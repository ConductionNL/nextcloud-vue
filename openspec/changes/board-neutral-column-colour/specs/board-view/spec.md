# board-view Delta: board-neutral-column-colour

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-neutral-column-colour](../../)

## Purpose

A merged board column shows the colour somebody chose, not the default a row was stored with.

## ADDED Requirements

### Requirement: A merged column prefers a chosen colour

With `source.neutralColor` on a `columnFields` entry, a column merged from two or more referenced rows SHALL take the
first row colour, in column order, that is neither empty nor the neutral colour. When no row has such a colour, the
column SHALL take the neutral colour if a row holds it. Colours SHALL be compared as written, so "Grey" and a hex value
are chosen colours when the neutral colour is "grey". Without `neutralColor` a merged column SHALL take its first row's
colour.

#### Scenario: A grey row before an orange one

- **GIVEN** "In behandeling" is merged from a Woo row coloured grey, listed first, and a bezwaar row coloured orange
- **AND** the column field declares `neutralColor: "grey"`
- **THEN** the "In behandeling" column is drawn orange

#### Scenario: Every row grey

- **GIVEN** "Ontvangen" is merged from two rows coloured grey and the column field declares `neutralColor: "grey"`
- **THEN** the "Ontvangen" column is drawn grey

#### Scenario: No neutral colour declared

- **GIVEN** the same rows and no `neutralColor`
- **THEN** "In behandeling" is drawn grey, the colour of its first row
