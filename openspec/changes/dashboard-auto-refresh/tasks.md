# Tasks: dashboard-auto-refresh

### Task 1: The page reads its widgets again on a timer and from a button
- **spec_ref**: `openspec/changes/dashboard-auto-refresh/specs/dashboard-page/spec.md#requirement-a-dashboard-reads-its-widgets-again-on-a-timer`
- **files**: `src/components/CnDashboardPage/CnDashboardPage.vue`, `src/utils/autoRefresh.js`, `src/schemas/app-manifest-v2.schema.json`, `docs/components/cn-dashboard-page.md`, `src/components/CnDashboardPage/CnDashboardPage.md`
- [x] Implement: `autoRefresh` prop and manifest key, interval timer cleared on unmount, header refresh button busy while the reads land
- [x] Test: `tests/components/CnDashboardPageAutoRefresh.spec.js`

### Task 2: The page says when its data may be outdated
- **spec_ref**: `openspec/changes/dashboard-auto-refresh/specs/dashboard-page/spec.md#requirement-a-dashboard-says-when-its-data-may-be-outdated`
- **files**: `src/components/CnDashboardPage/CnDashboardPage.vue`, `src/composables/useEndpointSource.js`, `l10n/en.json`, `l10n/nl.json`
- [x] Implement: read outcome through `waitUntil`, warning with the last good time and Retry past `staleAfterSeconds`
- [x] Test: `tests/components/CnDashboardPageAutoRefresh.spec.js`, `tests/composables/useEndpointSource.spec.js`
