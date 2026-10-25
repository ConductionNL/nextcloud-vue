# active-filter-line-board-look Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [active-chip-group-name-over-bare-facet](../../)

## ADDED Requirements

### Requirement: A facet label that repeats the value does not name the chip

An Active-line chip SHALL use a facet bucket's label only when it differs from the value. When the bucket's label repeats
the value, the chip SHALL be named as without a facet: a group's display name, an option title or a declared label.

#### Scenario: DqTeamwachtrij

- GIVEN the team queue filtered on group zuiddrecht-vergunningen (display name "Vergunningen") and a facet bucket labelled with the id
- THEN the Active line reads "Team: Vergunningen"
