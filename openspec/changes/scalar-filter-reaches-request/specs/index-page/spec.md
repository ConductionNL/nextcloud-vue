# index-page Delta: scalar-filter-reaches-request

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [scalar-filter-reaches-request](../../)

## ADDED Requirements

### Requirement: A filter held as one value narrows the list

An active filter held as a single string, number or boolean, from `defaultFilters` or from the address, SHALL be sent
with the list request as that property's value, exactly as a selection of one value is. An empty value SHALL send
nothing.

#### Scenario: DqOrganisaties

- **GIVEN** the organisations list with `defaultFilters: { "address.place": "Zuiddrecht" }`
- **WHEN** the list loads
- **THEN** the request carries `address.place=Zuiddrecht` and the list shows only organisations in Zuiddrecht
