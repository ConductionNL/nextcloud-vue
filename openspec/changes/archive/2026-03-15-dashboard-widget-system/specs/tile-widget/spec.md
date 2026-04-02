# CnTileWidget Specification

## Purpose

`CnTileWidget` renders a quick-access tile with an icon and a link. It supports four icon types (SVG, CSS class, URL, emoji) and two link types (Nextcloud app route, external URL). Used internally by `CnDashboardPage` for tile-type widgets.

---

## Requirements

### Requirement: icon rendering

CnTileWidget SHALL render an icon based on the `iconType` field of the tile configuration.

#### Scenario: SVG icon

- GIVEN `tile.iconType` is `'svg'` and `tile.icon` contains inline SVG markup
- WHEN the component renders
- THEN the SVG is rendered inline

#### Scenario: CSS class icon

- GIVEN `tile.iconType` is `'class'` and `tile.icon` is `'icon-folder'`
- WHEN the component renders
- THEN a `<span>` with class `icon-folder` is rendered

#### Scenario: URL icon

- GIVEN `tile.iconType` is `'url'` and `tile.icon` is `'https://example.com/icon.png'`
- WHEN the component renders
- THEN an `<img>` with the URL as `src` is rendered

#### Scenario: emoji icon

- GIVEN `tile.iconType` is `'emoji'` and `tile.icon` is `'📊'`
- WHEN the component renders
- THEN the emoji character is displayed

---

### Requirement: link behavior

CnTileWidget SHALL navigate to the configured link when clicked.

#### Scenario: app link navigates within Nextcloud

- GIVEN `tile.linkType` is `'app'` and `tile.linkValue` is `'/apps/procest'`
- WHEN the user clicks the tile
- THEN the browser navigates to the Nextcloud app route

#### Scenario: external URL opens in new tab

- GIVEN `tile.linkType` is `'url'` and `tile.linkValue` is `'https://example.com'`
- WHEN the user clicks the tile
- THEN the URL opens in a new browser tab

---

### Requirement: visual styling

CnTileWidget SHALL apply the configured background and text colors.

#### Scenario: custom colors applied

- GIVEN `tile.backgroundColor` is `'#1a73e8'` and `tile.textColor` is `'#ffffff'`
- WHEN the component renders
- THEN the tile has blue background and white text

#### Scenario: default styling when no colors specified

- GIVEN no `backgroundColor` or `textColor` in the tile config
- WHEN the component renders
- THEN Nextcloud default CSS variable colors are used

---

### Requirement: title display

CnTileWidget SHALL display the tile title.

#### Scenario: title is shown

- GIVEN `tile.title` is `'Quick Access'`
- WHEN the component renders
- THEN "Quick Access" is displayed on the tile
