# index-page Delta: screens-column-hidden-by-default

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-column-hidden-by-default](../../)

## Purpose

A column the manifest marks hidden starts hidden, and the person can turn it on.

## ADDED Requirements

### Requirement: A column marked hidden starts hidden

An index page SHALL leave a declared column with `hidden: true` out of the table until its visible-column set names
that column's key. On a self-fetching page the seeded visible set SHALL NOT name it, so the Columns tab shows it
switched off. A page without `hidden` on any column SHALL render its columns as before.

#### Scenario: No saved column set

- **GIVEN** an index page with columns `title`, `{ key: "meetingType", hidden: true }` and `location`, and no saved column set
- **WHEN** the table renders
- **THEN** it shows Vergadering and Locatie and no Soort column

#### Scenario: Turned on

- **GIVEN** the same page
- **WHEN** the visible-column set names `meetingType`
- **THEN** the Soort column shows
