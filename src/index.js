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
	CnDataMatrix,
	CnFilterBar,
	CnStatusBadge,
	CnPagination,
	CnSettingsCard,
	CnSettingsSection,
	CnStatsBlock,
	CnStructuredDocReview,
	CnConfigurationCard,
	CnVersionInfoCard,
	CnCellRenderer,
	CnObjectCard,
	CnCardGrid,
	CnFacetSidebar,
	CnFederationStatus,
	CnRowActions,
	CnContextMenu,
	CnIndexPage,
	CnQuickFilterBar,
	CnMarkdownEditor,
	CnMassActionBar,
	CnDeleteDialog,
	CnCopyDialog,
	CnFormDialog,
	CnFormBuilder,
	CnAdvancedFormDialog,
	CnPropertiesTab,
	CnMetadataTab,
	CnPropertyValueCell,
	CnMassDeleteDialog,
	CnMassCopyDialog,
	CnKpiGrid,
	CnMassExportDialog,
	CnMassImportDialog,
	CnExportWizard,
	CnWizardDialog,
	CnRichSubmitDialog,
	CnSignatureCapture,
	CnIndexSidebar,
	CnRegisterMapping,
	CnThemePreview,
	CnRelationshipGraph,
	CnDashboardPage,
	CnDashboardGrid,
	CnWidgetWrapper,
	CnWidgetRenderer,
	CnTileWidget,
	CnTimelineView,
	CnItemCard,
	CnSchemaFormDialog,
	CnSearchPage,
	CnTabbedFormDialog,
	CnTimelineStages,
	CnTreeView,
	CnUserActionMenu,
	CnNotesCard,
	CnTasksCard,
	CnFilesCard,
	CnFileManager,
	CnTagsCard,
	CnAuditTrailCard,
	CnEmailCard,
	CnEmailTab,
	CnContactsCard,
	CnContactsTab,
	CnContactPicker,
	CnContactCreate,
	CnIntegrationTab,
	CnIntegrationCard,
	CnIntegrationWidgetGrid,
	CnIntegrationWidget,
	CnDetailCard,
	CnDetailPage,
	CnCard,
	CnStatsPanel,
	CnJsonViewer,
	CnColorPicker,
	CnDetailGrid,
	CnProgressBar,
	CnChartWidget,
	CnDateRangePicker,
	DEFAULT_DATE_RANGE_PRESETS,
	resolvePresetWindow,
	CnStatsBlockWidget,
	CnLockedBanner,
	CnObjectSidebar,
	CnInfoWidget,
	CnTableWidget,
	CnActionsBar,
	CnActionsMenu,
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
	CnFeaturesAndRoadmapPage,
	CnFeaturesAndRoadmapSidebar,
	CnFeaturesAndRoadmapView,
	CnFeaturesTab,
	CnRoadmapTab,
	CnRoadmapItem,
	CnSuggestFeatureModal,
	CnSupportDialog,
	CnNotificationPreferences,
	CnDeckCardPicker,
	CnDeckCardCreate,
	registerIcons,
	CnWidgetGrid,
	CnWidgetObjectTable,
	CnWidgetFormRenderer,
	CnWidgetWikiRenderer,
	CnWidgetMapViewer,
	CnWidgetCardGrid,
} from './components/index.js'

// AI Chat Companion component family
export { CnAiCompanion, CnAiFloatingButton, CnAiChatPanel, CnAiMessageList, CnAiInput } from './components/CnAiCompanion/index.js'
export { default as CnAiHistoryDialog } from './dialogs/CnAiHistoryDialog.vue'

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
export { useAiContext, useAiChatStream } from './composables/index.js'
export { useListView, useDetailView, useSubResource, useDashboardView, useContextMenu, useAppManifest, useAppStatus, useGraphQL, useDataSource, selectByPath, buildCountQuery, buildBucketQuery, useObjectSubscription, useObjectLock, LockConflictError, PermissionError, cnRenderMarkdown, useIntegrationRegistry, useRuntimeManifest, useSupportDialog } from './composables/index.js'

// Integration registry (pluggable integrations — sidebar tabs and widgets)
export { integrations, createIntegrationRegistry, installIntegrationRegistry, registerIntegration, getSharedRegistry, sharedRegistryIfInstalled, VALID_SURFACES, builtinIntegrations, registerBuiltinIntegrations, leafIntegrations, registerLeafIntegrations, talkIntegration, registerIntegrationIcons, INTEGRATION_ICON_COMPONENTS } from './integrations/index.js'

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
export { validateManifest, validateManifestV2 } from './utils/validateManifest.js'
export { resolveManifestSentinels, clearResolveCache } from './utils/resolveManifestSentinels.js'
export { resolveRouteSentinels, clearRouteSentinelWarnings } from './utils/resolveRouteSentinels.js'
export { filterWidgetsByVisibility, isWidgetVisible, getCurrentUserId, getCurrentUserGroups, resetVisibilityCache } from './utils/index.js'
export { dispatchAction } from './utils/actionsDispatcher.js'

// Errors
export { RegistryKindError } from './errors/RegistryKindError.js'

// V2 widget components are exported via the components barrel (src/components/index.js)
