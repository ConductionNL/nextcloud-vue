# index-filter-strip Delta: screens-filter-strip

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-filter-strip](../../)

## Purpose

An index page can narrow a list twice, as the queue boards do.

## ADDED Requirements

### Requirement: An index page can draw a second filter strip

An index page with `filterStrip` SHALL draw, under the toolbar, a pill for All and one per value of its field.
Picking a pill SHALL filter the list on that value, All SHALL clear the field's filter, and the active pill SHALL be
pressed. With `showCount` each pill SHALL show the number of rows it would show within the active quick filter.

#### Scenario: Channel within kind

- **GIVEN** quick filters on the kind and `filterStrip` on `channel` with `showCount`
- **WHEN** the person picks the kind "Klachten"
- **THEN** the channel pills count only complaints

#### Scenario: Picking a channel

- **WHEN** the person picks "E-mail"
- **THEN** the list shows only rows whose channel is email and "E-mail" is pressed
