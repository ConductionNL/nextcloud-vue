// Components
export {
	CnDataTable,
	CnFilterBar,
	CnListViewLayout,
	CnDetailViewLayout,
	CnStatusBadge,
	CnEmptyState,
	CnPagination,
	CnSettingsCard,
	CnStatsBlock,
	CnConfigurationCard,
} from './components/index.js'

// Store
export { useObjectStore, createObjectStore } from './store/index.js'
export { createSubResourcePlugin, emptyPaginated } from './store/index.js'

// Store plugins
export {
	auditTrailsPlugin,
	relationsPlugin,
	filesPlugin,
	lifecyclePlugin,
} from './store/plugins/index.js'

// Composables
export { useListView, useDetailView, useSubResource } from './composables/index.js'

// Utilities
export { buildHeaders, buildQueryString, parseResponseError, networkError, genericError } from './utils/index.js'

// CSS (consumers should import separately)
// import '@conduction/nextcloud-vue/src/css/index.css'
