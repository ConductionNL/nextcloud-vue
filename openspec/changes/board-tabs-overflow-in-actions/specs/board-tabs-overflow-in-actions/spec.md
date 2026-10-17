# board-tabs-overflow-in-actions Delta: board-tabs-overflow-in-actions

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-tabs-overflow-in-actions](../../)

## Purpose

In the board look a tab strip draws its pinned tabs and lists the rest in the Actions menu beside it, as boards
DqZaakMeer and DqZaakBesluiten draw a case.

## ADDED Requirements

### Requirement: Board tabs list their overflow in the Actions menu

In the board look CnTabsWidget SHALL move a tab out of the strip when it says `overflow: true`, when `hideEmpty` is set
and its count is 0, or when `maxVisibleTabs` places are taken. The activity (History) tab SHALL stay in the strip and
SHALL hold one of the `maxVisibleTabs` places. The tabs out of the strip SHALL be listed, in strip order, at the top of
the strip's Actions menu, and the strip SHALL draw no "More" button. With `showActions: false` the menu SHALL still
render while it has tabs to list, holding only those tabs. Outside the board look the behaviour SHALL be unchanged.

#### Scenario: Board DqZaakMeer

- **GIVEN** a case tabs widget in the board look with five pinned tabs and three `overflow` tabs
- **THEN** the strip reads Overview, Files, Contact, Tasks, History
- **AND** the Actions menu starts with the three overflow tabs
- **AND** no "More" button is drawn

#### Scenario: maxVisibleTabs in the board look

- **GIVEN** five tabs, the last the activity, and `maxVisibleTabs: 3`
- **THEN** the strip reads the first two tabs and History, and the other two are in the Actions menu

### Requirement: An opened overflow tab joins the strip before the last tab

A tab picked from the Actions menu SHALL open, SHALL be drawn in the strip just before the last pinned tab while it is
open, SHALL take focus, and SHALL leave the menu while it is open. CnTabs SHALL offer this as `overflowInNavEnd`.

#### Scenario: Board DqZaakBesluiten

- **GIVEN** the DqZaakMeer strip
- **WHEN** the user picks Decisions from the Actions menu
- **THEN** the strip reads Overview, Files, Contact, Tasks, Decisions, History with Decisions selected
