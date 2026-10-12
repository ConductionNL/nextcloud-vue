## ADDED Requirements

### Requirement: A facet offers the objects that hold no value

When OpenRegister reports a missing count above zero for a terms facet, the
index sidebar SHALL offer one extra option labelled "No value (N)", and
selecting it SHALL request the objects with `<property>_isnull=true`. The
option SHALL be exclusive: selected together with values, only the
`_isnull` filter is sent.

#### Scenario: the missing option filters on empty values

- **GIVEN** a facet `resultType` with one bucket and `missing: { results: 12 }`
- **WHEN** the sidebar renders its options
- **THEN** the last option reads "No value (12)"
- **AND WHEN** a person selects it
- **THEN** the list request carries `resultType_isnull=true` and no `resultType` value

#### Scenario: nothing missing, no extra option

- **GIVEN** a facet whose missing count is 0 or absent
- **THEN** the sidebar offers only the bucket options
