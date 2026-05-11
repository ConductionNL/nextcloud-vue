// CSS — auto-imported so consumers get styles with components
import './css/index.css'

// Re-export every Nc* component from @nextcloud/vue so consumer apps
// can import all Nextcloud-Vue + Conduction components from a single
// barrel, per ADR-004: "NEVER import from @nextcloud/vue directly —
// use @conduction/nextcloud-vue which re-exports all". Wildcard form
// is intentional so the barrel stays in sync without per-component
// edits when @nextcloud/vue adds new components. check-docs.js skips
// `export *` (its regex only matches the named-export form), so no
// docs are required for these pass-through re-exports — the source
// of truth is the upstream @nextcloud/vue documentation.
export * from '@nextcloud/vue'

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
	CnPropertiesTab,
	CnMetadataTab,
	CnPropertyValueCell,
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
	CnColorPicker,
	CnDetailGrid,
	CnProgressBar,
	CnChartWidget,
	CnStatsBlockWidget,
	CnLockedBanner,
	CnObjectSidebar,
	CnInfoWidget,
	CnTableWidget,
	CnActionsBar,
	CnIcon,
	CnPageHeader,
	CnNoteCard,
	CnObjectDataWidget,
	CnObjectMetadataWidget,
	CnLogsPage,
	CnSettingsPage,
	CnChatPage,
	CnFilesPage,
	CnWikiPage,
	CnPageRenderer,
	defaultPageTypes,
	CnAppNav,
	CnAppLoading,
	CnDependencyMissing,
	CnAppRoot,
	CnFeaturesAndRoadmapLink,
	CnFeaturesAndRoadmapView,
	CnFeaturesTab,
	CnRoadmapTab,
	CnRoadmapItem,
	CnSuggestFeatureModal,
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
	liveUpdatesPlugin,
	logsPlugin,
	registerMappingPlugin,
	selectionPlugin,
	searchPlugin,
	SEARCH_TYPE,
	getRegisterApiUrl,
	getSchemaApiUrl,
} from './store/plugins/index.js'

// Composables
export { useListView, useDetailView, useSubResource, useDashboardView, useContextMenu, useAppManifest, useAppStatus, useGraphQL, useDataSource, selectByPath, buildCountQuery, useObjectSubscription, useObjectLock, LockConflictError, PermissionError, cnRenderMarkdown } from './composables/index.js'

// Composables — Features & roadmap menu (add-features-roadmap-menu)
export { useSpecRef } from './composables/useSpecRef.js'
export { useSuggestFeatureAction } from './composables/useSuggestFeatureAction.js'

// Utilities — Features & roadmap menu (add-features-roadmap-menu)
export { SAFE_MARKDOWN_DOMPURIFY_CONFIG } from './utils/safeMarkdownDompurifyConfig.js'
export { ROADMAP_LABEL_BLOCKLIST } from './utils/roadmapLabelBlocklist.js'

// Localization
export { registerTranslations } from './l10n/index.js'

// Utilities
export { buildHeaders, buildQueryString, parseResponseError, networkError, genericError } from './utils/index.js'
export { columnsFromSchema, formatValue, filtersFromSchema, fieldsFromSchema, validateValue } from './utils/index.js'
export { validateManifest } from './utils/validateManifest.js'
export { resolveManifestSentinels, clearResolveCache } from './utils/resolveManifestSentinels.js'
export { filterWidgetsByVisibility, isWidgetVisible, getCurrentUserId, getCurrentUserGroups, resetVisibilityCache } from './utils/index.js'
