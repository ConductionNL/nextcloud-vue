# condition-group-editor

## ADDED Requirements

### Requirement: Conditions combine in groups

`CnConditionGroupEditor` SHALL draw every group with a radio choice "How the conditions combine" between "Match all
conditions" (AND) and "Match any condition" (OR), label each row "Where" and then "and" or "or", and caption a row
holding an inner group "all of these" or "one of these". It SHALL offer Add group only on groups above `maxDepth`,
give every inner group a written Remove group, and emit the whole tree on every change in both v-model dialects.

#### Scenario: The board's segment

- **GIVEN** AND(Plaats equals Zuiddrecht, OR(Branche equals horeca, Branche equals detailhandel), Laatste contact after a date)
- **THEN** the root rows read "Where", "and", "and", with "one of these" before the inner group
- **AND** the inner rows read "Where" and "or"
- **AND** Add group shows once, on the root, and Remove group once, on the inner group

#### Scenario: Add a group

- **GIVEN** a root with one condition
- **WHEN** Add group is clicked
- **THEN** the tree gains `{ type: 'AND', children: [an empty condition] }`

#### Scenario: A deeper tree and a NOT group

- **GIVEN** a tree with a group inside an inner group, and a NOT group
- **THEN** every level renders, Add group shows on the root only
- **AND** the NOT group shows as a locked row "These conditions are kept as written" with a remove button

#### Scenario: A bare condition reads as a group

- **GIVEN** the value `{ field: 'place', operator: 'equals', value: 'Zuiddrecht' }`
- **THEN** the editor shows the root group, "Match all conditions" chosen, with that one row
