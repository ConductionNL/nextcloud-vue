# index-page Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [count-line-my-team-name](../../)

## ADDED Requirements

### Requirement: The count line can name the reader's team

An app SHALL be able to register a loader for the reader's team name (`registerMyTeamNameSource`). The board count line
SHALL fill `{myTeam}` with that name, and SHALL leave out a part in square brackets holding `{myTeam}` while the reader
has no team or the name is being read.

#### Scenario: DqTeamwachtrij

- GIVEN `countText` "{shown} of {total} open cases without a handler[ · team {myTeam}] · oldest first"
- AND the reader's team is "Woo en informatie"
- THEN the line reads "7 of 11 open cases without a handler · team Woo en informatie · oldest first"

#### Scenario: A reader in no team

- THEN the line reads "7 of 11 open cases without a handler · oldest first"
