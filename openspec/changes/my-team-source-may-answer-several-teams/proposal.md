# Proposal: my-team-source-may-answer-several-teams

## Why

Coordinator decision (24 Oct): the team queue's tile, list and menu badge count the cases without a handler in every
team the reader belongs to, one definition for all three. The list filters on `@myTeam`, which resolves to a single
group, so a reader in two teams saw one team's cases while the app counted both.

## What changes

The app's `registerMyTeamSource` loader may answer a list of group ids. `@myTeam` then resolves to that list (an IN
filter, as `@myGroups` does); a list of one reads as that id; an empty list reads as no team (`@myTeam?`, dropped).
A loader answering one id behaves as before. No schema change.
