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
	CnActionsBar,
	CnAdvancedFormDialog,
	CnAppLoading,
	CnAppNav,
	CnAppRoot,
	CnAuditTrailCard,
	CnCard,
	CnCardGrid,
	CnCellRenderer,
	CnChartWidget,
	CnChatPage,
	CnColorPicker,
	CnConfigurationCard,
	CnContextMenu,
	CnCopyDialog,
	CnDashboardGrid,
	CnDashboardPage,
	CnDataTable,
	CnDeleteDialog,
	CnDependencyMissing,
	CnDetailCard,
	CnDetailGrid,
	CnDetailPage,
	CnFacetSidebar,
	CnFeaturesAndRoadmapLink,
	CnFeaturesAndRoadmapView,
	CnFeaturesTab,
	CnFilesCard,
	CnFilesPage,
	CnFilterBar,
	CnFormDialog,
	CnIcon,
	CnIndexPage,
	CnIndexSidebar,
	CnInfoWidget,
	CnItemCard,
	CnJsonViewer,
	CnKpiGrid,
	CnLockedBanner,
	CnLogsPage,
	CnMassActionBar,
	CnMassCopyDialog,
	CnMassDeleteDialog,
	CnMassExportDialog,
	CnMassImportDialog,
	CnMetadataTab,
	CnNoteCard,
	CnNotesCard,
	CnObjectCard,
	CnObjectDataWidget,
	CnObjectMetadataWidget,
	CnObjectSidebar,
	CnPageHeader,
	CnPageRenderer,
	CnPagination,
	CnProgressBar,
	CnPropertiesTab,
	CnPropertyValueCell,
	CnQuickFilterBar,
	CnRegisterMapping,
	CnRoadmapItem,
	CnRoadmapTab,
	CnRowActions,
	CnSchemaFormDialog,
	CnSettingsCard,
	CnSettingsPage,
	CnSettingsSection,
	CnStatsBlock,
	CnStatsBlockWidget,
	CnStatsPanel,
	CnStatusBadge,
	CnSuggestFeatureModal,
	CnTabbedFormDialog,
	CnTableWidget,
	CnTagsCard,
	CnTasksCard,
	CnTileWidget,
	CnTimelineStages,
	CnUserActionMenu,
	CnVersionInfoCard,
	CnWidgetRenderer,
	CnWidgetWrapper,
	CnWikiPage,
	defaultPageTypes,
	registerIcons,
} from './components/index.js'

// AI Chat Companion component family
export { CnAiChatPanel, CnAiCompanion, CnAiFloatingButton, CnAiInput, CnAiMessageList } from './components/CnAiCompanion/index.js'
export { default as CnAiHistoryDialog } from './dialogs/CnAiHistoryDialog.vue'

// Store
export { createObjectStore, useObjectStore } from './store/index.js'
export { createCrudStore } from './store/index.js'
export { createSubResourcePlugin, emptyPaginated } from './store/index.js'

// Store plugins
export {
	auditTrailsPlugin,
	filesPlugin,
	getRegisterApiUrl,
	getSchemaApiUrl,
	lifecyclePlugin,
	liveUpdatesPlugin,
	logsPlugin,
	registerMappingPlugin,
	relationsPlugin,
	SEARCH_TYPE,
	searchPlugin,
	selectionPlugin,
} from './store/plugins/index.js'

// Composables
export { useAiChatStream, useAiContext } from './composables/index.js'
export { buildCountQuery, cnRenderMarkdown, LockConflictError, PermissionError, selectByPath, useAppManifest, useAppStatus, useContextMenu, useDashboardView, useDataSource, useDetailView, useGraphQL, useIntegrationRegistry, useListView, useObjectLock, useObjectSubscription, useSubResource } from './composables/index.js'

// Integration registry (pluggable integrations — sidebar tabs and widgets)
export { builtinIntegrations, createIntegrationRegistry, installIntegrationRegistry, integrations, registerBuiltinIntegrations, VALID_SURFACES } from './integrations/index.js'

// Composables — Features & roadmap menu (add-features-roadmap-menu)
export { useSpecRef } from './composables/useSpecRef.js'
export { useSuggestFeatureAction } from './composables/useSuggestFeatureAction.js'

// Utilities — Features & roadmap menu (add-features-roadmap-menu)
export { SAFE_MARKDOWN_DOMPURIFY_CONFIG } from './utils/safeMarkdownDompurifyConfig.js'
export { ROADMAP_LABEL_BLOCKLIST } from './utils/roadmapLabelBlocklist.js'

// Localization
export { registerTranslations } from './l10n/index.js'

// Utilities
export { buildHeaders, buildQueryString, genericError, networkError, parseResponseError } from './utils/index.js'
export { columnsFromSchema, fieldsFromSchema, filtersFromSchema, formatValue, validateValue } from './utils/index.js'
export { validateManifest } from './utils/validateManifest.js'
export { clearResolveCache, resolveManifestSentinels } from './utils/resolveManifestSentinels.js'
export { filterWidgetsByVisibility, getCurrentUserGroups, getCurrentUserId, isWidgetVisible, resetVisibilityCache } from './utils/index.js'
