# Tasks: saved-view-tokens-my-team

### Task 1: @myTeam resolves to the current user's primary team
- **spec_ref**: `openspec/changes/saved-view-tokens-my-team/specs/schema-utilities/spec.md#requirement-myteam-resolves-to-the-current-users-primary-team`
- **files**: `src/utils/myTeam.js`, `src/utils/resolveFilterTokens.js`, `src/utils/sentinelTokens.js`, `src/schemas/app-manifest-v2.schema.json`, `docs/utilities/sentinel-vocabulary.md`
- [x] Implement: registerMyTeamSource, loadMyTeam, peekMyTeam; the token; the vocabulary
- [x] Test: `tests/utils/myTeamToken.spec.js`, `tests/schemas/filterTokens.spec.js`

### Task 2: A saved view's filter tokens are resolved when it is applied
- **spec_ref**: `openspec/changes/saved-view-tokens-my-team/specs/saved-views-ui/spec.md#requirement-a-saved-views-filter-tokens-are-resolved-when-it-is-applied`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`
- [x] Implement: resolve and drop on apply, wait for the team, group chip names
- [x] Test: `tests/components/CnSavedViewMyTeam.spec.js`
