# related-filters-on-array-elements Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [related-filters-on-array-elements](../../)

## ADDED Requirements

### Requirement: Type fields can be filtered on the row's own answers

With `relatedFieldFilters.related.element` set to an array property, the field filters SHALL compile to
`_element[<property>][…]` blocks, one per filled field and numbered when there are more, and SHALL keep, clear and read
refusals of those keys as they do `_related` keys.

#### Scenario: A case-type field

- **GIVEN** the Cases page sets `related: { element: "properties" }`
- **WHEN** the reader asks Oppervlakte from 100
- **THEN** the list asks `_element[properties][propertyDefinition]=<pd>&_element[properties][value][gte]=100`
