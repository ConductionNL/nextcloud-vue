# sections-widget Delta: abstract-sections-widget

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [abstract-sections-widget](../../)

## Purpose

One configurable widget for "several widgets in one place, each under its own
heading", so an app lists its sections in the manifest instead of shipping a
component that stacks them.

## ADDED Requirements

### Requirement: A sections widget stacks configured widgets under headings

The `sections` widget type SHALL render `content.sections[]` in order. A
section SHALL name its widget inline (`widget`) or by the id of a sibling
definition on the surface (`widgetId`); a section whose widget cannot be found
SHALL be skipped, with a development warning for an unknown id. Each child
SHALL render through the detail widget host in bare mode. The title
(`title`, alias `label`) and `description` SHALL go through the host translate
function; the section SHALL be labelled by its heading. Without `cards`, a
1px rule SHALL separate a section from a shown section before it. A child that
does not set `content.fit` SHALL get `fit: false`.

#### Scenario: A folded case tab

- **GIVEN** sections "Documenten" (`widgetId: "case-documents"`) and "Zaakmap" (inline `files` widget)
- **WHEN** the tab opens
- **THEN** both render in order under their headings with a rule between them

### Requirement: A section whose widget draws nothing stays silent

With `hideEmpty` not false, a section whose widget renders no text and no
graphical or form element SHALL show no heading and take no space, and its
widget SHALL stay mounted so it can fill later; the heading SHALL appear when
it does.

#### Scenario: A case type without a work instruction

- **GIVEN** a section whose widget renders nothing
- **WHEN** the tab opens
- **THEN** the section takes no space and the next shown section has no rule above it unless a shown section precedes it

### Requirement: A sections widget can draw cards in a main and a side column

With `cards: true` each shown section SHALL be a card (border, card radius,
card padding), 20px apart. When any section has `column: "side"` the widget
SHALL draw two columns, main `1fr` and side at most 418px, 20px apart, side
sections in the side column in order; below 1024px one column.

#### Scenario: A portal's settings tab

- **GIVEN** `cards: true`, three main sections and one with `column: "side"`
- **WHEN** the tab opens
- **THEN** the side card sits right of the main cards, 20px from them, top-aligned

### Requirement: A tab panel passes its siblings on

The tabs widget SHALL pass the surface's widget definitions to the widget of
its open panel, so a container widget inside a tab can resolve sibling ids.

#### Scenario: Sections inside a tab

- **GIVEN** a tab whose widget is a `sections` widget naming siblings by id
- **WHEN** the tab opens
- **THEN** the sections resolve
