# saved-views-ui Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [saved-view-tokens-my-team](../../)

## Purpose

A saved view can be about the reader.

## ADDED Requirements

### Requirement: A saved view's filter tokens are resolved when it is applied

Applying a saved view SHALL resolve the `@`-tokens in its filters and drop optional tokens that resolve to nothing. A
view that names `@myTeam` SHALL apply once the team is known. On the Active line a filter on a Nextcloud-group field
SHALL be named by the group's display name.

#### Scenario: DqTeamwachtrij

- **GIVEN** the team queue view with `filters: { assignedGroup: "@myTeam" }` and Pieter in Woo en informatie
- **WHEN** Pieter opens the queue
- **THEN** the list shows his team's unassigned cases and the Active line reads "Team: Woo en informatie"
