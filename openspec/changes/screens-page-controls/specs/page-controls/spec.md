# page-controls Delta: screens-page-controls

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-page-controls](../../)

## Purpose

Let a dashboard page offer a "show completed" switch and a sort select that its lists follow, declared in the manifest.

## ADDED Requirements

### Requirement: A toggle and a select are page controls

A `workspace-filter` with `style: "toggle"` SHALL draw a switch that writes `onValue` (default true) when on and
`offValue` (default false) when off to its `writes` key, and SHALL write the off value on load when nothing else is
set. With `urlKey` the state SHALL be in the address.

#### Scenario: Show completed

- **GIVEN** a switch writing `showDone`
- **WHEN** the page loads and the user turns the switch on
- **THEN** `showDone` is false, then true

### Requirement: A bar holds the page's controls in one row

With `layout: "bar"` the widget SHALL draw its `controls` side by side in one wrapping row, each label left of its
control, and a control with `align: "end"` SHALL sit at the right edge.

#### Scenario: Chips, switch and select

- **GIVEN** a bar with chips, a switch (`align: "end"`) and a select
- **WHEN** it renders in a 1118px cell
- **THEN** the chips are left, the switch right of them and the select right of the switch, on one row

### Requirement: A list listens to the page's controls

A list widget with `pageControls` SHALL use the sort that `sort.map` gives for the value at `sort.key` (its own sort
when there is none), and SHALL drop the filter keys in `toggle.removes` while the value at `toggle.key` is on. It
SHALL refetch when either control changes. Without `pageControls` it SHALL ignore the controls.

#### Scenario: Sort and show completed

- **GIVEN** a ticket list filtered on `status`, sorted by title, with both controls declared
- **WHEN** the select says `deadline` and the switch is on
- **THEN** the request orders by the deadline field and carries no `status` filter
