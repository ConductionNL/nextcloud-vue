# Tasks: my-team-source-may-answer-several-teams

### Task 1: @myTeam may resolve to several teams
- **spec_ref**: `openspec/changes/my-team-source-may-answer-several-teams/specs/schema-utilities/spec.md#requirement-myteam-may-resolve-to-several-teams`
- **files**: `src/utils/myTeam.js`, `src/utils/resolveFilterTokens.js`
- [x] Implement: normalizeTeam, resolveMyTeam takes a list
- [x] Test: `tests/utils/myTeamToken.spec.js`

### Task 2: A menu count resolves @myTeam as the list does
- **spec_ref**: `openspec/changes/my-team-source-may-answer-several-teams/specs/schema-utilities/spec.md#requirement-a-menu-count-resolves-myteam-as-the-list-does`
- **files**: `src/components/CnAppRoot/CnAppRoot.vue`
- [x] Implement: wait for the team, drop the optional token
- [x] Test: `tests/components/CnAppRootMenuCountMyTeam.spec.js`
