# pl4-nc-dashboard Delta: pl4-nc-dashboard

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [pl4-nc-dashboard](../../)

## Purpose

Nextcloud Dashboard widgets that create records and act on lists are configuration.

## ADDED Requirements

### Requirement: A dashboard widget can create an object

CnNcDashboardQuickCreate SHALL render the configured fields and create one OpenRegister object in `register`/`schema`
from `defaults` (tokens resolved, templates filled from `context`), the `derive` values and the entered values. A
select SHALL store the option's value, never its translated label. A required field left empty SHALL be marked and
nothing written. A failed create SHALL say so and keep what was typed. After a create it SHALL link to `successHref`
filled from the created object, or go there with `openAfterCreate`. `registerNcDashboardWidgets` SHALL mount it for a
widget with `type: "quick-create"`.

#### Scenario: A new lead from the Dashboard

- **GIVEN** the pipelinq "New lead" widget with a pipeline select (`default: "first"`) and `derive.stage` from its stages
- **WHEN** the user types a title and submits
- **THEN** the lead is created with the first pipeline and that pipeline's first stage, and the widget links to it

### Requirement: A dashboard list can search, act on rows and merge sources

CnNcDashboardList with `search` SHALL ask the server for the typed text (`_search`) instead of filtering what it
loaded. `rowActions` SHALL offer per row a link, a copy of a row field (hidden while the field is empty) or an inline
CnNcDashboardQuickCreate with the row as its context. `create` SHALL open an inline create form, after which the list
reads again. `sources` SHALL merge several sources, newest first by `sortBy`, each row opening its own source's page.
A `subtitle` list SHALL join its filled parts with a middle dot and drop an empty part with its separator.

#### Scenario: Finding client 250

- **GIVEN** 300 clients and the Find client widget
- **WHEN** the user types the 250th client's name
- **THEN** the server is asked for it and the client is listed
