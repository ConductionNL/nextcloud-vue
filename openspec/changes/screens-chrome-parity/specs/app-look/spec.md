# app-look Delta: screens-chrome-parity

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-chrome-parity](../../)

## Purpose

One opt-in switch that moves an app, or one of its pages, to the look of the
screens on identity.conduction.nl, and the page frame every board shares.

## ADDED Requirements

### Requirement: An app can take the board look

The manifest v2 schema SHALL accept `look` at the root and `config.look` on a
page, each `"nextcloud"` (the default) or `"board"`. `CnAppRoot` SHALL put the
class `cn-look-board` on its root element when the root `look` is `"board"`. A
page whose `config.look` differs from the root SHALL put `cn-look-board` or
`cn-look-nextcloud` on its own root, and the nearest class SHALL win. The
library SHALL scope every board rule under `.cn-look-board`, in a new
stylesheet `src/css/look-board.css` that defines the board dimensions as
custom properties: `--cn-board-content-padding` (24px 28px),
`--cn-board-content-max-width` (1240px), `--cn-board-section-gap` (20px),
`--cn-board-control-height` (40px), `--cn-board-control-radius` (8px),
`--cn-board-card-radius` (12px), `--cn-board-card-padding` (20px 22px),
`--cn-board-hairline` (default `var(--color-border)`) and
`--cn-board-text-soft` (default `var(--color-main-text)`). Colours SHALL be
Nextcloud variables only. An app that sets neither key SHALL render exactly as
before.

#### Scenario: An app without the key

- **GIVEN** a manifest with no `look`
- **WHEN** any page renders
- **THEN** no element carries `cn-look-board` and the computed styles of the index, detail and settings pages equal those of the previous release

#### Scenario: The app takes the board look

- **GIVEN** a manifest with `look: "board"`
- **WHEN** the app renders
- **THEN** the `CnAppRoot` root element carries `cn-look-board`

#### Scenario: One page keeps the Nextcloud look

- **GIVEN** `look: "board"` at the root and `config.look: "nextcloud"` on the settings page
- **WHEN** the settings page renders
- **THEN** its root carries `cn-look-nextcloud` and none of the board rules apply inside it

#### Scenario: An unknown value is refused

- **GIVEN** `look: "compact"`
- **WHEN** the manifest is validated
- **THEN** validation fails naming `look` and the allowed values

@e2e include Render one manifest twice, with and without `look: "board"`; assert the class and compare the computed padding of the page root.

### Requirement: Page content takes the board frame

Under the board look the content area of an index, detail, dashboard and
settings page SHALL have padding `var(--cn-board-content-padding)` (24px top
and bottom, 28px at the sides), a maximum width of
`var(--cn-board-content-max-width)` (1240px) aligned to the start, and
`var(--cn-board-section-gap)` (20px) between its blocks. The 56px start inset
that clears the navigation toggle (`.cn-page-header`, `.cn-detail-page__header`)
SHALL apply only while the navigation is closed. While the navigation is open
Nextcloud's toggle sits on the navigation's end edge: its click area overlaps
the start of the title by about 5px by 7px, while the icon does not touch the
text. That overlap is accepted, because Nextcloud owns the toggle; the board
look does not move it and does not inset the open header for it.

#### Scenario: The frame of a list

- **GIVEN** an index page under the board look with the navigation open, at 1440px
- **WHEN** it renders in a browser
- **THEN** the page title starts 28px from the navigation's right edge, 24px below the top of the content, and the content is no wider than 1240px

#### Scenario: The navigation is closed

- **GIVEN** the same page with the navigation closed
- **WHEN** it renders
- **THEN** the header keeps its 56px start inset and the toggle does not cover the title

@e2e include Measure the title box against the navigation box with the navigation open and closed.

### Requirement: Header buttons share one board button

Under the board look every button in a page header (index, detail, dashboard,
settings) SHALL be `var(--cn-board-control-height)` (40px) high with radius
`var(--cn-board-control-radius)` (8px) and a 14px label at weight 600. A
secondary button SHALL be outlined: background `--color-main-background`, 1px
border `--color-border-dark` (board `#c4c7cb`), padding 0 14px, icon 20px and
gap 8px before the label. A primary button SHALL be filled
`--color-primary-element` with `--color-primary-element-text`, no border,
padding 0 16px. The buttons SHALL sit in one row with a 10px gap, wrapping
under the title only when the row has no room. No header button SHALL be
icon-only except the buildiq square.

#### Scenario: A detail header row

- **GIVEN** a detail page under the board look with two quick actions, Edit, the buildiq square and the More menu
- **WHEN** it renders in a browser
- **THEN** all five controls are 40px high, the gap between neighbours is 10px, and More shows its label

@e2e include Assert height, radius and gap of the header controls on an index, a detail and a settings page.
