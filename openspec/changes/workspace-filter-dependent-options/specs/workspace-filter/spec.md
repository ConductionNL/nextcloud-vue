# workspace-filter Delta: workspace-filter-dependent-options

## ADDED Requirements

### Requirement: A filter reloads its options when a workspace key it reads changes

A workspace-filter whose `endpointSource` or `source` names another workspace key (`@workspace.<key>`, not its own)
SHALL read its options again when that key's value changes. When the new options do not hold the current pick, the
filter SHALL write the first option, or the empty choice when `allLabel` is set. A change of its own key SHALL NOT
read the options again.

#### Scenario: From groups to teachers

- **GIVEN** a kind switch writing `kind` and a picker reading `/options?kind=@workspace.kind`, with group 1A picked
- **WHEN** the user switches to teachers
- **THEN** the picker lists the teachers and picks the first one
