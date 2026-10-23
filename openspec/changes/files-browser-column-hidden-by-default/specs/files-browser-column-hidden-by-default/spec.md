# files-browser-column-hidden-by-default Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [files-browser-column-hidden-by-default](../../)

## Purpose

A files browser column can start hidden and be shown from the Columns chooser.

## ADDED Requirements

### Requirement: A declared column can start hidden

A CnFilesBrowser column declared with `hidden: true` SHALL be left out of the table while the user has stored no column
choice, SHALL be listed in the Columns chooser, SHALL still serve `groupBy` and `facets`, and SHALL show once the user
ticks it. A stored choice SHALL decide visibility as before.

#### Scenario: The case Files tab

- **GIVEN** the Files tab declaring Direction and Keywords with `hidden: true`
- **THEN** the table shows neither until the user ticks it in Columns
- **AND** the Keywords filter chips work all the same
