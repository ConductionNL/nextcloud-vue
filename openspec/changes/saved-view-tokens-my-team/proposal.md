# Proposal: saved-view-tokens-my-team

## Why

Board DqTeamwachtrij opens the team queue on the reader's own team, "Team: Woo en informatie", removable. The queue is a
saved view, and a saved view's filters were resolved only for a manifest default, never dropped an optional token, and
had no token for "my team": `@myGroups` is every group the user is in, which is not their team.

## What changes

- `@myTeam`: the current user's primary team, as the app answers it through `registerMyTeamSource(loader)`. Unresolved
  while read; `@myTeam?` (optional, dropped) for a user in no team or an app without a source. Never all groups.
- Applying any saved view resolves its filter tokens and drops optional ones that answer nothing; a view on `@myTeam`
  applies once the team is known.
- An Active-line chip on a Nextcloud-group field names the group by its display name.
- Schema 2.145.0: `@myTeam` joins the filter token vocabulary.
