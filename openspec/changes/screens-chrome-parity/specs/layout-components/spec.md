# layout-components Delta: screens-chrome-parity

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-chrome-parity](../../)

## Purpose

The app navigation and the buildiq square as the screens draw them, under the
board look. Without the look both render as before.

## ADDED Requirements

### Requirement: The navigation takes the board anatomy

Under the board look `CnAppNav` SHALL render 264px wide, with padding 20px
14px and 20px between its groups (primary action, each menu section, the
card, the footer). A menu entry SHALL be at least 42px high, padding 0 10px,
radius 8px, gap 12px between icon and label, label 15px at weight 500 in
`--color-main-text`. The active entry SHALL take background
`--color-primary-element-light`, text `--color-primary-element-light-text`
and weight 600, with no other active marker. A section caption
(`type: "caption"`) SHALL be 12px, weight 600, letter-spacing 0.06em,
uppercase, `--color-text-maxcontrast`, padding 0 10px 6px. The navigation
SHALL have a white surface and a 1px `--color-border` line on its end side.
The primary action (`zuiddrecht-pixel-gaps`, solid) SHALL be 42px high,
radius 8px, label 15px weight 600.

#### Scenario: The dossiq sidebar

- **GIVEN** the dossiq navigation under the board look with a primary action, an unlabelled group of three entries, the sections Cases and Relations, a card and a footer
- **WHEN** it renders in a browser at 1440px
- **THEN** the navigation is 264px wide, every entry is 42px high, the captions read in uppercase 12px, and the groups are 20px apart

@e2e include Measure width, entry height and group gap of the navigation against werkplek/AppZijbalk.

### Requirement: A navigation count can ask for attention

A menu entry counter SHALL accept `counterVariant`: `"default"` or
`"attention"`. Under the board look a default counter SHALL be a 22px high
pill (min-width 22px, padding 0 6px, radius 11px, 12px weight 700) on
`--color-border` with `--color-main-text`; an attention counter SHALL be the
same pill filled `--color-error` with white text. Without the board look the
counter SHALL render as Nextcloud's counter bubble, as before, and
`counterVariant: "attention"` SHALL map to the bubble's highlighted state.

#### Scenario: Unread work

- **GIVEN** "My work" with `counter: 6, counterVariant: "attention"` under the board look
- **WHEN** the navigation renders
- **THEN** the count is a 22px red pill with a white 6 at the end of the entry

### Requirement: The navigation footer reads Help, then Advanced

Under the board look the footer (`nav.footer`) SHALL render its entries 40px
high, 15px, in the order Help, then Advanced, whatever order the manifest
declares; module pages SHALL open from the Advanced foldout. The navigation
SHALL NOT render a "More" group. The card above the footer
(`zuiddrecht-pixel-gaps`) SHALL have radius 12px, padding 16px, background
`--color-background-hover`, a 15px bold title, a 14px muted text at line
height 1.4 and a 14px weight 600 link, 8px apart, pushed down by
`margin-top: auto`.

#### Scenario: A manifest lists Advanced first

- **GIVEN** `nav.footer` with Advanced before Help, under the board look
- **WHEN** the navigation renders
- **THEN** Help is the first footer entry and Advanced the second

@e2e include Assert footer order and the card's margin-top: auto against werkplek/AppZijbalk.

### Requirement: The buildiq square is one square everywhere

`CnBuildiqEditButton` SHALL fill its trigger with `--cn-buildiq-color`
(default `#f36c21`, the ADR-041 brand exception, unchanged). Under the board
look the trigger SHALL be 40px by 40px, radius 8px, with a 20px white glyph,
and SHALL sit in the page header: on an index page directly before the primary
header button, on a detail page between Edit and More, on a dashboard and a
settings page directly before the primary button or last when there is none.
An index page under the board look SHALL NOT render a second buildiq button
in its actions bar.

#### Scenario: Index header order

- **GIVEN** an index page under the board look with header buttons Download, Actions and New case (primary)
- **WHEN** it renders
- **THEN** the header reads Download, Actions, the buildiq square, New case, and the actions bar has no buildiq button

#### Scenario: The theme colour

- **GIVEN** a theme that sets `--cn-buildiq-color: #e2611a`
- **WHEN** the square renders
- **THEN** its background is `#e2611a`

@e2e include Assert the square's size, colour and DOM position on an index, a detail and a settings page.
