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
