# card-board-look Delta: screens-card-parity

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-card-parity](../../)

## Purpose

Record cards and catalogue cards as the screens draw them, under the board
look. Without the look every card renders as before.

## ADDED Requirements

### Requirement: The card grid takes the board track

Under the board look `CnCardGrid` and `CnStorePage` SHALL lay their cards out
in `repeat(auto-fill, minmax(var(--cn-card-grid-min, 260px), 1fr))` with a gap
of `var(--cn-card-grid-gap, 16px)`, cards stretched to the row height.
Without the look the grid SHALL keep `minmax(320px, 1fr)` and 16px.

#### Scenario: Four columns at 1440px

- **GIVEN** twelve cards in an index cards view under the board look, at 1440px with the navigation open
- **WHEN** the grid renders in a browser
- **THEN** it shows four columns 16px apart

### Requirement: A record card has a head, facts and one action

Under the board look `CnObjectCard` SHALL be `--color-main-background` with a
1px `--color-border` border, radius 12px, padding 16px, 12px between its
parts, no shadow and no hover lift or hover border; a card SHALL show focus
with the standard focus ring only. The head row SHALL hold, 12px apart: an
optional leading element (`leading`: initials in a 36px circle on
`--color-background-hover`, or a schema icon in a 36px square of radius 8px
on a tint), the title as a 15px weight 600 link in `--color-main-text` with a
14px muted sub line under it, and at the end either the status pill
(`status`; padding 2px 8px, radius 10px, 12px weight 600, colours from the
status colour map) or the row menu as a 34px round transparent button named
"More actions for <title>". The facts (`config.cardFields`, default the
first four list columns) SHALL render as a two-column list (`max-content
1fr`, gap 6px 14px, 14px), labels in sentence case in
`--color-text-maxcontrast`, after a 1px `--cn-board-hairline` rule with 12px
above the list. When `footerAction` is set the card SHALL end with a footer:
a 1px `--cn-board-hairline` rule, 10px above, `margin-top: auto`, a 13px
muted meta text at the start and one secondary button 34px high, radius 8px,
at the end. The selection checkbox SHALL render only while the list is in
selection mode.

#### Scenario: A resident card

- **GIVEN** a resident with initials SV, title "Sanne de Vries", sub line "Parkstraat 24, Zuiddrecht", four card fields and a row menu
- **WHEN** the card renders under the board look
- **THEN** the head row shows the 36px initials, the title link, the sub line and a 34px menu button, and the facts list has four rows with sentence-case labels

#### Scenario: No hover lift

- **GIVEN** the same card
- **WHEN** the pointer moves over it
- **THEN** its transform and border stay as they were

@e2e include Measure the card box, head row and facts list against pipelinq/LijstKaarten.

### Requirement: The cards view keeps the list toolbar and footer

Under the board look the cards view of `CnIndexPage` SHALL render the same
header, toolbar (chips, Filter, view switch, search row), bulk band and
footer (`CnPagination` board variant) as the table view, so switching view
changes only the area between the toolbar and the footer. The footer SHALL
render under the grid with the same rule, padding and content as in the table
card. The cards view SHALL NOT render "Show more".

#### Scenario: Switching from table to cards

- **GIVEN** an index page under the board look in the table view
- **WHEN** the user picks cards in the view switch
- **THEN** the header, the toolbar and the footer text stay where they were and only the table is replaced by the grid

@e2e include Switch view and compare the toolbar and footer boxes before and after.

### Requirement: A catalogue card has an icon, a state and one action

Under the board look the cards of `CnStorePage` (and of the integrations
grid) SHALL be `--color-main-background` with a 1px `--color-border` border,
radius 12px, padding 18px, 10px between parts. The head row SHALL hold a 40px
icon chip of radius 10px on `--color-primary-element-light` with the icon in
`--color-primary-element-light-text`, and, 12px after it, the title as an h3
of 17px weight 700 line height 1.3, the kind and publisher line ("<kind> ·
<publisher>") at 13px muted, and the state pill (padding 2px 10px, radius
12px, 13px weight 600: "Installed" on the success tint, "Update" on the
warning tint, none when not installed), 4px apart. The description SHALL be
14px, line height 1.5, in `--cn-board-text-soft`. The card SHALL end with a
footer pushed to the bottom (`margin-top: auto`, 10px above a 1px
`--cn-board-hairline` rule, at least 34px high): the version at 13px muted at
the start and one secondary action ("Open", "Install" or "Update") 34px high
at the end, named "<action> <title>".

#### Scenario: An installed template

- **GIVEN** a store item "B2B sales pipeline", kind "Pipeline template", publisher Conduction, installed at version 1.3.0
- **WHEN** the store renders under the board look
- **THEN** the card shows the icon chip, the title, "Pipeline template · Conduction", an "Installed" pill, the description, and a footer with "Version 1.3.0" and an Open button

@e2e include Compare a store card with pipelinq/PqStore.
