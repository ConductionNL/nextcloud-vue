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

// Override @nextcloud/vue's NcSelectTags with a fixed version. An explicit
// named export shadows the same name coming from the `export *` above, so
// every consumer importing `NcSelectTags` from this barrel transparently gets
// the corrected component (tolerant systemtags fetch + consumer `:options`
// honoured). See src/components/NcSelectTags/.
export { default as NcSelectTags } from './components/NcSelectTags/NcSelectTags.js'

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
	CnAdminSettingsShell,
	CnCellRenderer,
	CnObjectCard,
	CnCardGrid,
	CnObjectRow,
	CnObjectList,
	CnFolderTree,
	CnFolderSidebar,
	fetchWebdavFolderTree,
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
	CnSetupWizard,
	CnWalkthrough,
	CnRichSubmitDialog,
	CnSignatureCapture,
	CnIndexSidebar,
	CnRegisterMapping,
	CnRegisterSchemaSelect,
	CnThemePreview,
	CnRelationshipGraph,
	CnDashboardPage,
	CnDashboardGrid,
	CnWidgetWrapper,
	CnWidgetEditCog,
	CnIconPicker,
	CnDashboardIcon,
	CnIconBrowser,
	mdiCatalogue,
	vmdiCatalogue,
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
	CnResourceSelect,
	CnIntegrationTab,
	CnIntegrationCard,
	CnIntegrationWidgetGrid,
	CnIntegrationWidget,
	CnDetailCard,
	CnDetailPage,
	CnLifecycleActions,
	CnSummaryAggregates,
	CnRelatedCollections,
	CnBodySections,
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
	CnStatWidget,
	CnStatWidgetForm,
	CnDeltaWidget,
	CnDeltaWidgetForm,
	CnGaugeWidget,
	CnGaugeWidgetForm,
	CnObjectListWidget,
	CnObjectListWidgetForm,
	CnChartWidgetForm,
	CnStatsBlockWidgetForm,
	CnLockedBanner,
	CnObjectSidebar,
	CnInfoWidget,
	CnTableWidget,
	CnActionsBar,
	CnActionsMenu,
	CnOpenBuildEditButton,
	CnEditMenuModal,
	CnEditPagesModal,
	CnEditSettingsModal,
	CnEditSidebarModal,
	CnEditActionsModal,
	CnAddWidgetModal,
	CnWidgetStyleEditorModal,
	CnWidgetVisibilityRulesModal,
	CnRelationLinkModal,
	CnMenuItemEditor,
	CnTextTableEditor,
	CnNcWidgetGridPicker,
	CnIcon,
	CnPageHeader,
	CnNoteCard,
	CnObjectDataWidget,
	CnObjectMetadataWidget,
	CnObjectMetadataModal,
	CnRelatedObjectsWidget,
	CnLogsPage,
	CnSettingsPage,
	CnChatPage,
	CnFilesPage,
	CnPageRenderer,
	defaultPageTypes,
	CnAppNav,
	CnAppLoading,
	CnDependencyMissing,
	CnAppRoot,
	CnTenantBadge,
	CnTranslatedBadge,
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
	CnWidgetMapViewer,
	CnWidgetCardGrid,
	CnLabelWidget,
	CnLabelWidgetForm,
	CnTextWidget,
	CnTextWidgetForm,
	CnImageWidget,
	CnImageWidgetForm,
	CnLinkButtonWidget,
	CnLinkButtonWidgetForm,
	CnHeaderWidget,
	CnHeaderWidgetForm,
	CnDividerWidget,
	CnDividerWidgetForm,
	CnFilesWidget,
	CnFilesWidgetForm,
	CnPeopleWidget,
	CnPeopleWidgetForm,
	CnNewsWidget,
	CnNewsWidgetForm,
	CnQuicklinksWidget,
	CnQuicklinksWidgetForm,
	CnLinksWidget,
	CnLinksWidgetForm,
	CnMenuWidget,
	CnMenuWidgetForm,
	CnContainerWidget,
	CnContainerWidgetForm,
	CnVideoWidget,
	CnVideoWidgetForm,
	CnCalendarWidget,
	CnCalendarWidgetForm,
	CnSpendAnalyticsWidget,
	CnSpendAnalyticsWidgetForm,
	CnNcWidgetWidget,
	CnNcDashboardWidgetForm,
	CnDashTileWidget,
	CnDashTileWidgetForm,
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
export { useListView, useDetailView, useSubResource, useDashboardView, useContextMenu, clearContextMenuPositionDom, CTX_MENU_CSS_VAR_X, CTX_MENU_CSS_VAR_Y, CTX_MENU_DATA_ATTR, useAppManifest, useAppStatus, useSetupStatus, useWalkthrough, useGraphQL, useDataSource, selectByPath, buildCountQuery, buildBucketQuery, useObjectSubscription, useObjectLock, LockConflictError, PermissionError, cnRenderMarkdown, useIntegrationRegistry, useRuntimeManifest, useSupportDialog, useClickDragGuard, useTenantContext, provideTenantContext, createTenantContext, TENANT_CONTEXT_KEY, useManifestEditor, useOpenBuildEditAvailability } from './composables/index.js'

// Integration registry (pluggable integrations — sidebar tabs and widgets)
export { integrations, createIntegrationRegistry, installIntegrationRegistry, registerIntegration, getSharedRegistry, sharedRegistryIfInstalled, VALID_SURFACES, builtinIntegrations, registerBuiltinIntegrations, leafIntegrations, registerLeafIntegrations, talkIntegration, fieldInspectionIntegration, registerIntegrationIcons, INTEGRATION_ICON_COMPONENTS } from './integrations/index.js'

// Offline data-collection core (generic IndexedDB cache + mutation queue, pure
// sync-queue engine, replay-on-reconnect, planning-fetch contract, sync-state
// + checklist helpers). Consumed by the field-inspection leaf and by any app
// that registers a checklist/planning schema. The full set of helpers is
// importable from `@conduction/nextcloud-vue/src/integrations/offline`; the
// curated entry points consuming apps use are re-exported here.
// See docs/utilities/offline-collection.md.
export { DEFAULT_FIELD_INSPECTION_CONFIG, offlineCollection } from './integrations/index.js'

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
export { safeHref, safeImageSrc, safeSvgPath } from './utils/index.js'
export { dispatchAction } from './utils/actionsDispatcher.js'
export { placeNewWidget, getDashboardColumnOpts } from './utils/dashboardPlacement.js'
export { DASHBOARD_ICONS, DEFAULT_ICON, getIconComponent, isCustomIconUrl } from './components/CnIconPicker/index.js'
export { mergeManifestDelta } from './utils/mergeManifestDelta.js'
export { buildManifest, applyMenuLayout, mergeMenuItems, mergePages, applyMenuRelocations, applyMenuRemovals, applySettingsSection } from './utils/buildManifest.js'
export { diffManifest } from './utils/diffManifest.js'
export { resolveSlotColumns } from './utils/resolveSlotColumns.js'
// Dashboard widget library (cn-widget-library) — registry helpers + form composable.
export { dashboardWidgetRegistry, registerDashboardWidget, listWidgetTypes, getWidgetTypeEntry, getDefaultContent } from './components/CnWidgetGrid/dashboardWidgetRegistry.js'
export { registerBuiltinDashboardWidgets } from './components/CnWidgetGrid/registerDashboardWidgets.js'
export { useWidgetForm } from './composables/useWidgetForm.js'

// Errors
export { RegistryKindError } from './errors/RegistryKindError.js'

// V2 widget components are exported via the components barrel (src/components/index.js)
