# dashboard-page Delta: screens-stat-tile-parity

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-stat-tile-parity](../../)

## Purpose

Let a KPI tile draw the DqDashboard tile under the board look: stacked by
default, the icon in a tinted circle at the end of the label row, the value
in its state colour, and the tile one link without underline.

## ADDED Requirements

### Requirement: The board KPI tile is stacked by default

In the board look CnStatWidget SHALL take the stacked layout when
`content.layout` is absent, and SHALL keep an explicit `layout`. A linked
board tile SHALL render no underline in any layout. Without the board look
a tile without `content.layout` SHALL keep the horizontal card.

#### Scenario: A tile without a layout is stacked in the board look

- **GIVEN** the board look and a stat tile with a caption and no `layout`
- **WHEN** it renders
- **THEN** it carries the stacked class and the caption is a line of its own under the value

#### Scenario: Without the board look nothing changes

- **GIVEN** no board look and the same tile
- **WHEN** it renders
- **THEN** it is the horizontal card with its icon circle

### Requirement: The board KPI tile can carry its icon at the end

In the board look, a tile with an icon and `content.iconPlacement: "end"`
SHALL draw the label left and the icon (18px) in a 32px circle at the right
end of the label row, and SHALL NOT draw the glyph before the label. The
circle SHALL be tinted by the tile's state: the success, warning or error
tone when the value is coloured by that variant (static `variant`,
`variantWhen` or an override), else the primary light tone. The value SHALL
keep its state colour, the success tone included. Without the board look
`iconPlacement` SHALL have no effect.

#### Scenario: The overdue tile

- **GIVEN** the board look and a tile with `iconPlacement: "end"` and `variant: "error"`
- **WHEN** it renders
- **THEN** the label is first in the label row, the circle last with the error tone, and the value is in the error colour

#### Scenario: A plain tile

- **GIVEN** the board look and a tile with `iconPlacement: "end"` and no variant
- **WHEN** it renders
- **THEN** the circle has the primary tone and no glyph precedes the label
