# index-page Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [group-parents-from-records](../../)

## ADDED Requirements

### Requirement: A groups pane can read its tree from records

A `groups` folder pane with `parentsFrom: { register, schema, groupField?, parentField? }` SHALL list the Nextcloud
groups the records name in `groupField` (default `group`), each nested under the group in `parentField` (default
`parent`). A parent value that is the id of another record SHALL be read as that record's group. Groups no record names SHALL NOT be listed. When the records cannot be read, or no record names a group, the pane SHALL list every group
flat, as without the option.

#### Scenario: DqAfdelingen

- **GIVEN** department records Gemeente Zuiddrecht, Fysiek domein (under it) and Vergunningen (under Fysiek domein)
- **WHEN** the departments page opens
- **THEN** the pane draws Vergunningen under Fysiek domein under Gemeente Zuiddrecht, and no other group
