// CSS — auto-imported so consumers get styles with components
import './css/index.css'

// Components
export {
	CnDataTable,
	CnFilterBar,
	CnStatusBadge,
	CnPagination,
	CnSettingsCard,
	CnSettingsSection,
	CnStatsBlock,
	CnConfigurationCard,
	CnVersionInfoCard,
	CnCellRenderer,
	CnObjectCard,
	CnCardGrid,
	CnFacetSidebar,
	CnRowActions,
	CnContextMenu,
	CnIndexPage,
	CnMassActionBar,
	CnDeleteDialog,
	CnCopyDialog,
	CnFormDialog,
	CnAdvancedFormDialog,
	CnMassDeleteDialog,
	CnMassCopyDialog,
	CnKpiGrid,
	CnMassExportDialog,
	CnMassImportDialog,
	CnIndexSidebar,
	CnRegisterMapping,
	CnDashboardPage,
	CnDashboardGrid,
	CnWidgetWrapper,
	CnWidgetRenderer,
	CnTileWidget,
	CnItemCard,
	CnSchemaFormDialog,
	CnTabbedFormDialog,
	CnTimelineStages,
	CnUserActionMenu,
	CnNotesCard,
	CnTasksCard,
	CnDetailCard,
	CnDetailPage,
	CnCard,
	CnStatsPanel,
	CnJsonViewer,
	CnDetailGrid,
	CnProgressBar,
	CnChartWidget,
	CnObjectSidebar,
	CnInfoWidget,
	CnTableWidget,
	CnActionsBar,
	CnIcon,
	CnPageHeader,
	CnNoteCard,
	CnObjectDataWidget,
	CnObjectMetadataWidget,
	registerIcons,
} from './components/index.js'

// Store
export { useObjectStore, createObjectStore } from './store/index.js'
export { createCrudStore } from './store/index.js'
export { createSubResourcePlugin, emptyPaginated } from './store/index.js'

// Store plugins
export {
	auditTrailsPlugin,
	relationsPlugin,
	filesPlugin,
	lifecyclePlugin,
	registerMappingPlugin,
	selectionPlugin,
	searchPlugin,
	SEARCH_TYPE,
	getRegisterApiUrl,
	getSchemaApiUrl,
} from './store/plugins/index.js'

// Composables
export { useListView, useDetailView, useSubResource, useDashboardView, useContextMenu } from './composables/index.js'

// Utilities
export { buildHeaders, buildQueryString, parseResponseError, networkError, genericError } from './utils/index.js'
export { columnsFromSchema, formatValue, filtersFromSchema, fieldsFromSchema } from './utils/index.js'
export { filterWidgetsByVisibility, isWidgetVisible, getCurrentUserId, getCurrentUserGroups, resetVisibilityCache } from './utils/index.js'
