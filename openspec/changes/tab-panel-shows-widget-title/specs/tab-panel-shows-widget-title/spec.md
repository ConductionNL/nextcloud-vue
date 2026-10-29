# tab-panel-shows-widget-title Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [tab-panel-shows-widget-title](../../)

## Purpose

A tab can head its single widget's panel with the widget's title.

## ADDED Requirements

### Requirement: A tab can show its single widget's title

A `content.tabs[]` entry of CnTabsWidget SHALL take `showTitle`. When it is `true` and the tab holds one widget with
a title, the panel SHALL draw that title as its heading even when the widget has no description. A title equal to the
tab's label SHALL NOT be drawn. A widget description SHALL still draw under the title. Without the key the panel
SHALL behave as before.

#### Scenario: A data widget heads the Overview tab

- GIVEN a tab `{ label: "Overview", widgetId: "list-data", showTitle: true }`
- AND the widget `list-data` has the title "List details" and no description
- WHEN the tab is open
- THEN the panel heading reads "List details" in the user's language
- AND no line is drawn under it

#### Scenario: The title repeats the tab

- GIVEN a tab with `showTitle: true` whose label equals its widget's title
- WHEN the tab is open
- THEN no panel heading is drawn
