# reports-page Delta: screens-reports-page-board-look

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-reports-page-board-look](../../)

## Purpose

The reports page reads as board DcRapportages under the board look.

## ADDED Requirements

### Requirement: The reports page takes the board look

Under the board look the reports page SHALL draw its title at 28px bold over a 14px muted lead, SHALL draw one section
per declared category that holds a card, in the declared order and headed by the category's label at 18px bold, with
the cards that have no declared category first under no heading, and SHALL NOT draw the category filter. A card SHALL
draw its `icon` in a 44px tile beside its title (17px bold) and description (14px muted). Without the board look the
page SHALL render as before.

#### Scenario: decidiq Rapportages

- **GIVEN** cards in the categories "Besluiten en stemmingen" and "Vergaderingen en mensen"
- **WHEN** the page renders under the board look
- **THEN** it draws two sections with those headings, each a grid of icon cards, and no category select
