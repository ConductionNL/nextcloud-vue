# related-field-filters Delta

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: A list filters on a type's own declared fields

CnRelatedFieldFilters SHALL read the definitions in scope, offer only `filterable` ones (a number as a range, a date as a date range, a declared list as a select, else text), compile the entered values into one `_related[<schema>][<backref>]` block per filled field, numbered after the backref when there are several, and hand them to the list through `sidebarState.onFilterChange` as well as the route. It SHALL render nothing while its `$route.query` scope is empty and clear its filters then, replay a shared link's blocks into the fetch, and name the field of a refused block under the bar. CnFilterBar SHALL draw `range` and `dateRange` filters as two bounds under one legend, each named "{field}, from" and "{field}, up to". CnIndexPage SHALL draw the bar beside the search for `config.relatedFieldFilters`.

#### Scenario: Two fields filled

- **GIVEN** a case type with two filterable fields
- **WHEN** the reader enters a lower bound on one and picks a value on the other
- **THEN** the list receives `_related[caseProperty][case][0][…]` and `_related[caseProperty][case][1][…]`
