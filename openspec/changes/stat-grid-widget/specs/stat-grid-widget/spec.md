# stat-grid-widget Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [stat-grid-widget](../../)

## Purpose

Several figures can share one card and still come from different apps.

## ADDED Requirements

### Requirement: A stat grid draws figures from a shared or their own source

The `stat-grid` widget SHALL draw one flat, stacked stat per cell in `columns` columns (default 2, at most 4). A cell
SHALL read the grid's `endpointSource` unless it names its own.

#### Scenario: Uw dag

- **GIVEN** a grid over dossiq's end-of-day endpoint with a cell Uren over humaniq's summary
- **THEN** Geopend and Vastgelegd read dossiq and Uren reads humaniq, in one card

### Requirement: A cell can show only while a condition holds

A cell with `visibleWhen` SHALL show only once its condition evaluates true. A condition that is false, fails or cannot
be read SHALL hide that cell and SHALL leave the other cells.

#### Scenario: humaniq absent

- **GIVEN** the Uren cell with `visibleWhen: { appInstalled: "humaniq" }` on an instance without humaniq
- **THEN** the grid shows the other figures and no Uren
