# Proposal: route-my-team-token-resolves

## Why

On :8080 (25 Oct, REFRESH-1) `/apps/dossiq/cases?_view=board&assignedGroup=@myTeam` opened empty with the Active chip
"Team: @myTeam": an address's filters are resolved once at setup, before the reader's team is read, so `@myTeam` stayed
literal. A saved view on `@myTeam` already waits for the team; a shared link or bookmark did not.

## What changes

When the address's filters carry `@myTeam`, the self-fetching list waits for the team, then resolves the token (the team,
several teams as an IN list, or no team filter for a reader in none) and fetches again. No schema change.
