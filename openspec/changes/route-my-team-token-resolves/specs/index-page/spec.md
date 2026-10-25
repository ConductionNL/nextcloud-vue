# index-page Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [route-my-team-token-resolves](../../)

## ADDED Requirements

### Requirement: An address carrying @myTeam opens on the reader's team

When an index page's address carries `@myTeam` in a filter, the list SHALL wait for the reader's team and then filter on
it (or on several teams, or on none for a reader in no team), as a saved view on `@myTeam` does. The token SHALL not be
sent or shown literally once the team is read.

#### Scenario: DqWerkbord

- GIVEN /apps/dossiq/cases?_view=board&assignedGroup=@myTeam for a reader in Woo en informatie
- THEN the board shows that team's cases and the Active line reads "Team: Woo en informatie"
