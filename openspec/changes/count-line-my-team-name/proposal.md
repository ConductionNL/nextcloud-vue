# Proposal: count-line-my-team-name

## Why

The team queue's line under the title (DqTeamwachtrij) names the reader's team: "7 van 11 open zaken zonder
behandelaar · team Woo en informatie · oudste eerst". The library knows the reader's team only as a group id
(`@myTeam`, for filters), so the count line cannot name it.

## What changes

- An app may register where the reader's team NAME is read, `registerMyTeamNameSource(loader)`, beside
  `registerMyTeamSource`. `loadMyTeamName()` reads it once per page; `peekMyTeamName()` is the reactive read ('' for no
  team, null while reading).
- The board count line (`countText`, `countTextByView`) fills `{myTeam}` with that name. A part in square brackets that
  holds `{myTeam}` is left out while there is no name, so "[ · team {myTeam}]" disappears for a reader in no team.
