# schema-utilities Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [saved-view-tokens-my-team](../../)

## Purpose

A filter can name the reader's own team.

## ADDED Requirements

### Requirement: @myTeam resolves to the current user's primary team

`@myTeam` SHALL resolve to the Nextcloud group id the app's registered team source answers for the current user
(`ctx.myTeam` first). While the team is being read it SHALL stay unresolved. For a user in no team, a failed read or an
app that registered no source it SHALL become the optional `@myTeam?`, which callers drop; it SHALL never resolve to the
user's other groups. The source SHALL be asked once per page.

#### Scenario: Pieter in Woo en informatie

- **GIVEN** the app answers `zuiddrecht-woo-en-informatie` for Pieter
- **THEN** `{ assignedGroup: "@myTeam" }` resolves to `{ assignedGroup: "zuiddrecht-woo-en-informatie" }`

#### Scenario: A user in no team

- **GIVEN** the app answers no team
- **THEN** `{ assignedGroup: "@myTeam" }` resolves to no filter on assignedGroup
