# schema-utilities Delta: nextcloud-group-surfaces

## ADDED Requirements

### Requirement: @myGroups resolves to the current user's group ids

`resolveFilterValue` SHALL resolve the filter token `@myGroups` to an array
of the ids of the Nextcloud groups the current user is in, so a filter
`{ assignedGroup: "@myGroups" }` reaches OpenRegister as an IN filter
(`assignedGroup[]=a&assignedGroup[]=b`). Inside an IN-list array the ids SHALL
be spread in place. A `ctx.myGroups` array SHALL win over the looked-up
groups. While the groups are still loading, and when the user is in no group,
the token SHALL stay unresolved, so `hasUnresolvedTokens` reports the filter
as waiting and no request is sent: an empty IN list would match every row.
The lookup SHALL be reactive, so a computed filter re-runs when the groups
arrive. `SENTINEL_TOKEN_PATTERNS.filter` and the manifest schema's
`sentinelFilterToken` SHALL accept `@myGroups`.

#### Scenario: A team queue filters on the reader's teams

- **GIVEN** the current user is in `behandelaars` and `toezicht`
- **WHEN** `resolveFilterTokens({ assignedGroup: "@myGroups", assignee: "IS NULL" })` runs after the groups loaded
- **THEN** it SHALL return `{ assignedGroup: ["behandelaars", "toezicht"], assignee: "IS NULL" }`

@e2e exclude Covered by tests/utils/resolveFilterTokensMyGroups.spec.js; the groups come from a Nextcloud OCS endpoint the library's Playwright suite does not serve, and dossiq's e2e covers the queue in a real instance.

#### Scenario: A person in no team sees nothing, not everything

- **GIVEN** the current user is in no group
- **THEN** `resolveFilterValue("@myGroups")` SHALL return `"@myGroups"` unchanged
- **AND** `hasUnresolvedTokens` SHALL be true for a filter holding it

@e2e exclude Covered by tests/utils/resolveFilterTokensMyGroups.spec.js.

#### Scenario: The manifest schema accepts the token

- **GIVEN** `SENTINEL_TOKEN_PATTERNS.filter`
- **THEN** it SHALL match `@myGroups` and SHALL equal the schema's `sentinelFilterToken` pattern

@e2e exclude A schema assertion, covered by tests/utils/sentinelTokens.spec.js.
