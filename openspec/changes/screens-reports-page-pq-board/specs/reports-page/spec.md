# reports-page Delta: screens-reports-page-pq-board

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-reports-page-pq-board](../../)

## Purpose

Under the board look the reports page draws board PqReports, the one design every app's reports page shares.

## MODIFIED Requirements

### Requirement: The reports page draws board PqReports

Under the board look a reports page SHALL draw, above its sections, one chip per category that holds a card, after an
"All categories" chip, each with its card count; the active chip SHALL be pressed (`aria-pressed`), and choosing one
SHALL narrow the sections to that category. Each section SHALL be captioned in small uppercase muted text, with cards
without a known category first under no caption. Cards SHALL sit three a row (two, then one, as the column narrows),
each an article with an icon tile (a fallback icon when the card names none), the title, the category name, the
description, and a footer with the card's `note` (default "Opens its own page") and an "Open" link to the card's route.
Beside the sections a side column of at most 300px SHALL list the categories with their counts (choosing one selects
its chip) and a note card: `sideNote` `{ title, text }`, the library's own note when absent, none when `false`. A
`footnote` SHALL be drawn under the page with an info icon. Every library string SHALL come from the library catalogue,
in English and Dutch. Without the board look the page SHALL render as before.

#### Scenario: Board PqReports

- **GIVEN** a reports page under the board look with five categories and eight cards
- **WHEN** the page renders
- **THEN** six chips read "Alle categorieën 8" and one per category with its count
- **AND** each section is captioned in uppercase, with its cards three a row, each ending in "Opent een eigen pagina" and "Open"
- **AND** the side column lists the five categories with counts above "Mis je een rapportage?"

#### Scenario: The Nextcloud look

- **GIVEN** the same page without the board look
- **WHEN** the page renders
- **THEN** it draws the category select and one grid of link cards, with no chips, side column or footnote
