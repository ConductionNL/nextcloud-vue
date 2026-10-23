# index-sidebar Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [sidebar-sort-direction-segmented](../../)

## Purpose

The sort direction reads as the board draws it.

## ADDED Requirements

### Requirement: The board look draws the sort direction as two segments

On the board look the index sidebar's Sort section SHALL draw the direction as a "Direction" heading over a stretched
segmented control with "Ascending" (an up arrow) and "Descending" (a down arrow), the current direction checked and the
heading naming the group. Picking a segment SHALL emit the order in that direction. Both segments SHALL be disabled when
no field is chosen or the chosen order is one of its own. The Nextcloud look SHALL keep two radio buttons.

#### Scenario: Sorted on deadline, ascending

- **GIVEN** the cases list on the board look, sorted on Termijn ascending
- **WHEN** the sidebar's Search tab opens
- **THEN** "Richting" shows over "Oplopend" (checked) and "Aflopend"

#### Scenario: Turning the order round

- **GIVEN** the same list
- **WHEN** the reader picks "Aflopend"
- **THEN** the list is sorted on Termijn descending
