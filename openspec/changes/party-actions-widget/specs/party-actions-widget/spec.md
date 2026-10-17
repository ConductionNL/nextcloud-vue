# party-actions-widget

**Status**: proposed
**Scope**: nextcloud-vue

## Purpose

Draw a party page's indicators and quick actions from configuration.

## ADDED Requirements

### Requirement: A party page draws one band of indicators and quick actions

The `party-actions` widget SHALL show each configured indicator whose local `visibleWhen` holds against the page
object, with its tone and its translated label filled from the object (an indicator whose label fills empty is left
out). Without a shown indicator it SHALL show `emptyText` and the `emptyActions`. It SHALL hand the `actions` that have an
id and a label to CnActionButtons, inline and secondary by default.

#### Scenario: No warnings

- **GIVEN** indicators for aggression and debt, a record with neither, `emptyText` "No warnings for this resident." and an "Add warning" empty action
- **WHEN** the band renders
- **THEN** it shows the sentence and "Add warning", and the quick actions at the end
