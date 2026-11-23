# settings-board-look Delta: screens-chrome-parity

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-chrome-parity](../../)

## Purpose

The admin settings page as the screens draw it: the board header, the
sections as cards in a grid, and one declared place to save.

## ADDED Requirements

### Requirement: The admin settings shell takes the board header

Under the board look `CnAdminSettingsShell` SHALL render its title as an h1 of
28px, weight 700, line height 1.2, with the description under it at 15px in
`--color-text-maxcontrast`, 6px apart, and SHALL NOT render
`NcSettingsSection`'s documentation icon. When `docUrl` is set the header
SHALL render a labelled secondary "Documentation" link-button on the title
row, directly before the buildiq square. The shell SHALL lift its 900px
maximum width to `var(--cn-board-content-max-width)`.

#### Scenario: The pipelinq settings header

- **GIVEN** the pipelinq admin settings under the board look with a `docUrl`
- **WHEN** the page renders in a browser
- **THEN** the title row reads "Pipelinq settings", then Documentation, then the buildiq square at the end, and no documentation icon sits beside the title

@e2e include Compare the header row of the settings shell with pipelinq/PqBeheer.

### Requirement: Settings sections are cards in a grid

Under the board look the sections of `CnAdminSettingsShell` and
`CnSettingsPage` SHALL render as cards in a grid of
`repeat(auto-fit, minmax(420px, 1fr))` with a 20px gap, aligned to the start.
A card SHALL have background `--color-main-background`, a 1px `--color-border`
border, radius 12px, padding 22px 24px and 14px between its parts. Its title
SHALL be an h2 of 19px, weight 700, line height 1.3, with the description
under it at 14px, line height 1.45, in `--color-text-maxcontrast`, 4px apart.
Section actions (`#actions`) SHALL sit at the end of the title row, not
floated. A section with `wide: true` SHALL span the whole grid row.

#### Scenario: Two columns at 1440px

- **GIVEN** a settings page with four sections under the board look at 1440px with the navigation open
- **WHEN** it renders in a browser
- **THEN** the sections form two columns, each card has radius 12px and 22px top padding

@e2e include Assert the grid columns and card anatomy against pipelinq/PqBeheer and decidiq/DcBeheer.

### Requirement: A settings page saves in one declared place

A settings page SHALL accept `config.saveMode`: `"section"` or `"page"`.
With `"section"` each section that has fields SHALL end in a footer row,
separated by a 1px `--cn-board-hairline` rule, holding its own primary Save
button at the bottom right of the card (the end of the row), and the page SHALL render no page save bar. With
`"page"` the page header SHALL render one primary Save as its last button and
a "Changes" card SHALL list the changed fields of every section until they
are saved; no section SHALL render a save button. A personal settings page
that saves on change SHALL accept `config.autosave: true`, render no save
button at all, and end its description with "Changes are saved
automatically." Without `saveMode` and `autosave` the page SHALL render the
save bar under the last section, as before. A manifest that sets
`saveMode` and also gives a section its own save SHALL fail validation.

#### Scenario: One save per section

- **GIVEN** `saveMode: "section"` and three sections with fields
- **WHEN** the page renders
- **THEN** each card ends with a Save button at its bottom end and there is no page save bar

#### Scenario: One save for the page

- **GIVEN** `saveMode: "page"` and a change in two sections
- **WHEN** the page renders
- **THEN** the header's last button is Save and the Changes card names both changed fields

#### Scenario: Personal settings that save on change

- **GIVEN** `autosave: true` on a personal settings page
- **WHEN** the page renders
- **THEN** there is no save button and the description ends with "Changes are saved automatically."

@e2e include Render one settings manifest three times (section, page, autosave) and count the save buttons.

### Requirement: The version card takes the board facts and footer

Under the board look `CnVersionInfoCard` SHALL draw its facts as a
two-column list (`max-content 1fr`, gap 8px 16px, 14px, label in
`--color-text-maxcontrast`, value weight 600) and end in a footer row after a
1px `--cn-board-hairline` rule, holding the state ("Up to date" as a disabled
button on `--color-background-hover`, or the update button) and then the
re-import primary, 10px apart. The support lines SHALL follow the footer row.

#### Scenario: An installation that is up to date

- **GIVEN** a version card under the board look with name, version and configured version equal
- **WHEN** it renders
- **THEN** three facts are listed and the footer row reads "Up to date" then "Re-import configuration"
