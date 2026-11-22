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
- **THEN** the tile is a link to `/apps/files/` named "Files", in work-muted, with the Files icon in white

#### Scenario: Count

- **GIVEN** a tile with a count of 3
- **THEN** a white pill top right shows 3 and the link is named "Mail, 3 new items"
- **AND** a count above 99 shows as "99+"

#### Scenario: Pin and outage

- **GIVEN** a pinned tile for an app that is down
- **THEN** a pin shows top left, a red dot shows top right in place of the count
- **AND** the link is named "Raadsinformatie, outage, pinned"

### Requirement: Every palette colour keeps the white icon readable

The palette SHALL be the eight theme token roles: primary, primary-deep, accent, accent-deep, work-ink, work-text,
work-muted and work-field. Each colour SHALL draw `--cn-app-tile-<key>`, then the theme's `--sc-<key>`, then its
Zuiddrecht hex (primary `#3669A5`, accent `#CC0000`). Every fallback SHALL have a contrast of at least 3:1 against
white (WCAG 1.4.11).

#### Scenario: Contrast

- **WHEN** the unit test computes the contrast of every palette colour against white
- **THEN** every ratio is at least 3:1

### Requirement: An app keeps its colour

A tile without a colour SHALL take its app's default colour: a fixed colour for the common apps, otherwise one
derived from the app id, so the same app gets the same colour on every dashboard.

#### Scenario: Default colour

- **GIVEN** two dashboards with a Calendar tile and no colour set
- **THEN** both tiles are primary

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

### Requirement: A label can head a group of tiles

A `label` with `groupHeading: true` SHALL draw its text as a small uppercase heading (`h2`) on the page ground,
without its style keys, so a group of app tiles ("Mijn apps") has a heading.

#### Scenario: Mijn apps

- **GIVEN** a label "Mijn apps" with `groupHeading: true` above six app tiles
- **THEN** the dashboard shows the heading MIJN APPS above the tiles
