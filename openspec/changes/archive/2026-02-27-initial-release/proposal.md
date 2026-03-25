# Proposal: Initial Release

## Problem
Multiple Nextcloud apps (OpenRegister, Procest, Pipelinq) duplicate the same Vue components, store logic, and utilities, causing drift and maintenance burden.

## Solution
Create `@conduction/nextcloud-vue` as a shared component library extracting common patterns into a single package.

## Scope
- Core components: CnDataTable, CnFilterBar, CnListViewLayout, CnDetailViewLayout, CnStatusBadge, CnEmptyState, CnPagination, CnSettingsCard, CnStatsBlock, CnConfigurationCard
- Pinia-based useObjectStore with plugin architecture
- Composables: useListView, useDetailView, useSubResource
- Utilities: buildHeaders, buildQueryString, parseResponseError, networkError, genericError
- CSS modules with NL Design token support
