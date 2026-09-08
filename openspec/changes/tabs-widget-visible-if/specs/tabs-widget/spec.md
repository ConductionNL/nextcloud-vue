# tabs-widget Delta: tabs-widget-visible-if

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [tabs-widget-visible-if](../../)

## Purpose

A tab of `CnTabsWidget` can carry a visibility condition so an empty panel is
absent. Finding A33 of the dossiq round 2 analysis.

## ADDED Requirements

### Requirement: A tab may declare a visibility condition

The manifest v2 schema SHALL accept `visibleWhen` on a `tabs` widget tab
entry as a `$ref` to the existing `#/$defs/visibleWhen` predicate. A
local-mode predicate SHALL name a property of the page schema; the validator
SHALL fail otherwise, naming the tab id. A tab without the key SHALL always
render.

#### Scenario: Source-mode condition validates

- **GIVEN** a tab with `visibleWhen: { source: { register: "r", schema: "role", filter: { case: "@objectId" } }, field: "@total", op: "gt", value: 0 }`
- **WHEN** the manifest is validated
- **THEN** validation passes

#### Scenario: Unknown field refused

- **GIVEN** a tab with `visibleWhen: { field: "nope", op: "eq", value: 1 }` on a schema without `nope`
- **WHEN** the manifest is validated
- **THEN** validation fails naming the tab id and the field

@e2e exclude schema and validator change, unit-tested via jest, no browser surface.

### Requirement: A hidden tab is absent, not empty

`CnTabsWidget` SHALL evaluate a local-mode condition on every page object
change and a source-mode condition once on mount and after a write reported
through the workspace context. A tab whose condition is false SHALL NOT render
in the strip. A tab whose source condition is pending SHALL render disabled
with a loading state.

#### Scenario: No participants, no tab

- **GIVEN** a Participants tab with a source condition over `role` rows and a case with zero roles
- **WHEN** the widget renders and the count answers 0
- **THEN** the strip has no Participants tab

#### Scenario: A write brings the tab back

- **GIVEN** the same case and a role added through an object-list widget on the page
- **WHEN** the widget reports the write
- **THEN** the count re-runs and the Participants tab appears

#### Scenario: Field condition follows the object

- **GIVEN** a Decision tab with `visibleWhen: { field: "decision", op: "ne", value: null }` and an object whose `decision` is null
- **WHEN** the object gains a decision
- **THEN** the Decision tab appears without a reload

@e2e include Open a case detail with a conditional Participants tab and no roles; assert the tab is absent; add a role through the page; assert the tab appears.

### Requirement: The active tab is always a visible tab

When the active tab's condition turns false, `CnTabsWidget` SHALL activate the
first visible tab and update the route hash. A route hash naming a hidden tab
SHALL fall back to the first visible tab without an error.

#### Scenario: Deep link to a hidden tab

- **GIVEN** a route hash `#participants` and a hidden Participants tab
- **WHEN** the page renders
- **THEN** the first visible tab is active and no error is logged

@e2e include Navigate to a case detail with `#participants` while the tab is hidden; assert the first tab is active.
