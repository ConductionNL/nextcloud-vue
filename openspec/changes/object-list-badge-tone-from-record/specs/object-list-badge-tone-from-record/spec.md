# object-list-badge-tone-from-record Delta

## ADDED Requirements

### Requirement: An object list badge cell takes its tone and icon from the referenced record

A CnObjectListWidget `badge` column with `widgetProps.resolve: { register, schema, colorField?, iconField? }` SHALL
read those fields for the ids in its rows, one batch per column, and each cell SHALL take that record's tone and icon
over the column's `variant` and `colorMap`. A read that fails leaves the badge as declared.

#### Scenario: a sub-case's status

- **GIVEN** a Deelzaken list whose `status` badge column resolves `colour` on the status type
- **AND** a sub-case whose status type has the colour `purple`
- **THEN** that sub-case's status pill is purple
