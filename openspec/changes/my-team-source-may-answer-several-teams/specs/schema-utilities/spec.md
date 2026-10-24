# schema-utilities Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [my-team-source-may-answer-several-teams](../../)

## ADDED Requirements

### Requirement: @myTeam may resolve to several teams

When the app's team loader answers a list of group ids, `@myTeam` SHALL resolve to that list as an IN filter, with blank
entries dropped. A list of one SHALL resolve to that id and an empty list SHALL read as no team.

#### Scenario: DqTeamwachtrij

- GIVEN a reader in the teams Woo en informatie and Vergunningen
- THEN the team queue filters assignedGroup on both groups

### Requirement: A menu count resolves @myTeam as the list does

A menu entry's count whose filter carries \`@myTeam\` SHALL wait for the team to be read, then count over every team the
app answers; for a reader in no team the team filter SHALL be dropped, as the list drops it.

#### Scenario: DqTeamwachtrij

- GIVEN the Queue menu entry counts unassigned open cases on \`assignedGroup: @myTeam\`
- THEN its badge equals the team queue list's total
