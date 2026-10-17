# related-sections

**Status**: proposed
**Scope**: nextcloud-vue

## Purpose

Draw related items per kind, as the boards do.

## ADDED Requirements

### Requirement: Related items can be drawn as sections per kind

With `layout: "sections"` CnRelatedObjectsWidget SHALL draw one section per configured entry of `sections` (or per
non-empty group without any), each with its translated label, icon and a count chip, its rows with an Open link or
button, its `action` through CnActionButtons, and, when it has no rows, its translated `emptyText` in a dashed box. A
section with `schema` SHALL keep only the related objects whose schema slug, id or title matches. The tab strip SHALL
NOT render in this layout.

#### Scenario: A ticket's related items

- **GIVEN** a ticket used by a booking and using a client, and sections Appointments (booking), Client (client), Case (case, with an empty text) and Documents (files, with a link action)
- **WHEN** the widget renders
- **THEN** Appointments and Client show one row each, Case shows its sentence, and Documents shows its link action
