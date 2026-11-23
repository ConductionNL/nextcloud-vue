# stats-block-grid Delta: screens-stats-block-tile-box

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-stats-block-tile-box](../../)

## Purpose

A stats-block grid can draw each figure on a tile of its own, as board DcRapportages does.

## ADDED Requirements

### Requirement: A stats-block grid can box its tiles

A `stats-block` widget with `layout: "grid"` and `tiles: "box"` SHALL draw each stat tile on a surface of its own:
padding 14px 16px, radius 10px, the hover ground (`--color-background-hover`) as background, with 12px between tiles.
Without `tiles` the tiles SHALL stay without a box, as before.

#### Scenario: Vergaderingen en efficiëntie

- **GIVEN** a stats-block titled "Vergaderingen en efficiëntie" with `layout: "grid"`, `columns: 4` and `tiles: "box"`
- **WHEN** the reports page renders it
- **THEN** each of the four tiles has padding 14px 16px, radius 10px and the hover ground as background

#### Scenario: Je week tot nu toe keeps no box

- **GIVEN** a stats-block with `layout: "grid"` and no `tiles`
- **WHEN** the dashboard renders it
- **THEN** its tiles have no background and no padding
