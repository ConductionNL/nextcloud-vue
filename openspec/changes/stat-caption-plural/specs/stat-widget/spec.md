# stat-widget Delta: stat-caption-plural

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [stat-caption-plural](../../)

## Purpose

A stat caption reads right for one and for many.

## ADDED Requirements

### Requirement: A stat caption can take a singular and a plural form

A stat tile whose `caption` is `{ singular, plural }` SHALL show the singular when the count is one and the plural
otherwise. The count SHALL be the caption's own count when the tile has a `captionSource`, else the tile's number. The
chosen form SHALL be translated on its own and then filled as a string caption is. `zeroText` SHALL still apply at
zero. A string caption SHALL work as before.

#### Scenario: One case ends today

- **GIVEN** a tile with `caption: { singular: "{count} ends today", plural: "{count} end today" }` and a caption source counting one case
- **WHEN** the tile renders in Dutch
- **THEN** the caption reads "1 loopt vandaag af"

#### Scenario: Two cases end today

- **GIVEN** the same tile with a caption source counting two cases
- **WHEN** the tile renders in Dutch
- **THEN** the caption reads "2 lopen vandaag af"
