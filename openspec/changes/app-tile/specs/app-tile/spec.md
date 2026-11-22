# app-tile Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [app-tile](../../)

## Purpose

One app as one square, coloured tile on a dashboard.

## ADDED Requirements

### Requirement: An app tile is a square, coloured link with a white icon

`CnAppTile` SHALL draw one app as a square link in a solid colour of the app tile palette, with the app's icon in
white at about 45% of the tile and no visible text. The app's name SHALL be the link's accessible name and its
tooltip. A focused tile SHALL show a visible focus ring.

#### Scenario: Files

- **GIVEN** a tile for Files with no colour set
- **THEN** the tile is a link to `/apps/files/` named "Files", in the blue of the palette, with the Files icon in white

#### Scenario: Count

- **GIVEN** a tile with a count of 3
- **THEN** a bubble shows 3 and the link is named "Mail, 3 new items"
- **AND** a count above 99 shows as "99+"

### Requirement: Every palette colour keeps the white icon readable

Every colour of the app tile palette SHALL have a contrast of at least 3:1 against white (WCAG 1.4.11). The
palette SHALL hold the Zuiddrecht blue `#3669A5` and red `#CC0000`. Each colour SHALL be a `--cn-app-tile-<key>`
token with its hex as the fallback, so a theme can change it.

#### Scenario: Contrast

- **WHEN** the unit test computes the contrast of every palette colour against white
- **THEN** every ratio is at least 3:1

### Requirement: An app keeps its colour

A tile without a colour SHALL take its app's default colour: a fixed colour for the common apps, otherwise one
derived from the app id, so the same app gets the same colour on every dashboard.

#### Scenario: Default colour

- **GIVEN** two dashboards with a Calendar tile and no colour set
- **THEN** both tiles are red

### Requirement: The app-tile widget shows one app of the reader's navigation

The `app-tile` widget type SHALL take `{ appId, colour, showCount }` and SHALL read the app from the reader's
Nextcloud navigation. An app outside that navigation SHALL NOT be drawn as a link; the cell SHALL say the app is not
available. With `showCount` on, the count SHALL be the reader's notifications for that app; without the
Notifications app the tile SHALL show no count.

#### Scenario: App the reader may not open

- **GIVEN** an `app-tile` for Deck and a reader without access to Deck
- **THEN** the cell says "This app is not available to you" and holds no link

#### Scenario: Notifications

- **GIVEN** an `app-tile` for Mail and two Mail notifications for the reader
- **THEN** the tile shows 2
