# empty-state Delta: screens-empty-state-parity

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-empty-state-parity](../../)

## Purpose

One empty state, drawn inside its card, matching the screens when the app
takes the board look.

## ADDED Requirements

### Requirement: The card-size empty state

CnWidgetEmptyState SHALL take `size` (`"widget"` default, or `"card"`).
`card` SHALL render, centred, with padding 28px 20px and an 8px gap: a 48px
circle in `--color-background-dark` holding a 24px icon in
`--color-text-lighter`; the name as 16px/700 in the main text colour; the
description as 14px in `--color-text-maxcontrast`, line height 1.45, at most
480px wide; and the `action` slot 6px below the description. `widget` SHALL
render as today. In the board look a CnWidgetEmptyState without an explicit
`size` SHALL use `card` unless `compact` is set.

#### Scenario: Reports not yet composed

- **GIVEN** a board look card with name "The term 2 reports are not composed yet", a description and a primary button
- **WHEN** it renders in a browser
- **THEN** the circle is 48px, the name 16px bold, the description 14px grey, and the button sits 14px below the description

### Requirement: The library's empty states use it

In the board look CnIndexPage (no rows), CnCardGrid, CnDashboardPage (no
widgets), CnObjectKanban (no columns), CnDetailWidgetHost,
CnRelatedObjectsWidget, CnTabsWidget, CnObjectList and CnFilesBrowser SHALL
render CnWidgetEmptyState with `size="card"` instead of `NcEmptyContent` for
their empty case, inside the card or table body the content would have
filled, with the component's existing empty text as the name and its icon.
Each component's `empty` slot SHALL keep precedence. An error state SHALL
use the same block with the error icon and `--color-error` icon colour.
Without the board look these components SHALL keep `NcEmptyContent`.

#### Scenario: An index page with no rows

- **GIVEN** a board look index page whose filter matches nothing
- **WHEN** it renders
- **THEN** the table card stays, its header row stays, and the empty block sits inside the card body instead of a 64px icon under it

#### Scenario: The slot still wins

- **GIVEN** a board look CnCardGrid with an `empty` slot
- **WHEN** it has no items
- **THEN** the slot content renders and no built-in empty state does

### Requirement: Only a drop zone is dashed

In the board look an empty state SHALL NOT draw a dashed border. A file drop
zone (CnFileField, CnFilesBrowser upload target) SHALL draw a 2px dashed
`--color-border-dark` border, radius 12px, padding 22px, a 28px icon in
`--color-primary-element`, a 15px/700 line and a 14px grey sentence.

#### Scenario: Files tab with no files

- **GIVEN** a board look files tab with no files and upload allowed
- **WHEN** it renders
- **THEN** it shows the dashed drop zone and not a second empty state
