# toggle-table Delta: toggle-table-objects-and-map

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [toggle-table-objects-and-map](../../)

## Purpose

A settings card can switch a list of objects or a config map on and off, one row per item.

## ADDED Requirements

### Requirement: A toggle table can switch objects or a config map

With `bind.mode: "each"` the toggle-table widget SHALL draw one row per object read by `source`, with the switch on when that object's `bind.field` is true, and a toggle SHALL PATCH only that object's `bind.field` at `bind.register`/`bind.schema` (else the surface's), without needing a current object. With `bind.mode: "map"` the switch of a row SHALL be the boolean under the row's key in a map read from `bind.url` (at `bind.path`) or held in the current object's `bind.field`, and a toggle SHALL write that one key: through `save` for an endpoint map, by the field's dot-path on the current object otherwise. An endpoint map without `save` SHALL refuse the toggle and say so. `bind.invert` SHALL turn a false value into an on switch. A refused write SHALL draw the stored value again and show the server's words. `CnSettingsPage` SHALL resolve the `toggle-table` widget type as a built-in.

#### Scenario: Verplichte velden

- **GIVEN** FieldRequirement objects "Kostenplaats op elke inkoopfactuurregel" (active) and "Project op declaraties" (not active)
- **WHEN** the card renders with `bind: { mode: "each", field: "active" }`
- **THEN** the first switch is on and the second off
- **WHEN** the administrator turns on "Project op declaraties"
- **THEN** one PATCH `{ "active": true }` goes to that FieldRequirement object

#### Scenario: A config map behind an app endpoint

- **GIVEN** `bind: { mode: "map", url: "/apps/shillinq/api/settings", path: "required" }` and a `save` endpoint
- **WHEN** the administrator turns on "Project"
- **THEN** the save endpoint receives `{ "required": { "project": true } }`
