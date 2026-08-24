// CSS — auto-imported so consumers get styles with components
import './css/index.css'

// Dashboard widget catalog — bare side-effect import so the widget types
// self-register whenever this barrel is imported. This MUST live in the barrel
// itself (which is always included when a consumer imports anything from it):
// the equivalent import in components/index.js is dropped by `sideEffects`
// tree-shaking (ADR-061) when a consumer's used symbols never reach that
// sub-barrel, which collapses the Add-Widget picker to only the few types the
// consumer imports directly. The aggregator IS `sideEffects`-listed, so a bare
// import of it here is retained. Consumers on a bundler that still strips it can
// additionally call `registerBuiltinDashboardWidgets()` at bootstrap.
import './components/CnWidgetGrid/registerDashboardWidgets.js'

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
	CnObjectKanban,
	CnObjectCalendar,
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
	CnFieldHelper,
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
	CnGraphCanvas,
	CnFlowDetail,
	CnFlowSidebar,
	CnFlowIndexPage,
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
	CnSavedViewsControl,
	CnSaveViewDialog,
	CnSearchPage,
	CnCommandPalette,
	CnTabbedFormDialog,
	CnTimelineStages,
	CnTreeView,
	CnUserActionMenu,
	CnNotesCard,
	CnTasksCard,
	CnFilesCard,
	CnFileManager,
	CnRelatedFiles,
	CnTagsCard,
	CnAuditTrailCard,
	CnVersionHistory,
	CnEmailCard,
	CnEmailTab,
	CnContactsCard,
	CnContactsTab,
	CnContactPicker,
	CnContactCreate,
	CnResourceSelect,
	CnIntegrationTab,
	CnObjectAccessTab,
	CnIntegrationCard,
	CnIntegrationWidgetGrid,
	CnIntegrationWidget,
	CnLeafMountHost,
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
	CnFlowRunsWidget,
	CnFlowRunsWidgetForm,
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
	CnActionButtons,
	CnBuildiqEditButton,
	CnEditMenuModal,
	CnEditPagesModal,
	CnEditSettingsModal,
	CnEditSidebarModal,
	CnEditActionsModal,
	CnEditSetupModal,
	CnEditWalkthroughModal,
	CnEditSupportModal,
	CnEditDataModal,
	CnAddWidgetModal,
	CnWidgetStyleEditorModal,
	CnWidgetVisibilityRulesModal,
	CnRelationLinkModal,
	CnMenuItemEditor,
	CnTextTableEditor,
	CnNcWidgetGridPicker,
	CnTabs,
	CnTab,
	CnIcon,
	CnPageHeader,
	CnNoteCard,
	CnObjectDataWidget,
	CnObjectMetadataWidget,
	CnObjectMetadataModal,
	CnRelatedObjectsWidget,
	CnObjectGeoWidget,
	CnMapWidget,
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
	CnCredentials,
	CnDeckCardPicker,
	CnDeckCardCreate,
	registerIcons,
	CnWidgetGrid,
	CnWidgetObjectTable,
	CnWidgetFormRenderer,
	CnWidgetMapViewer,
	CnWidgetCardGrid,
	CnNavCardGrid,
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

// Deprecated alias kept for consumers: the app formerly called OpenBuild was
// renamed to Buildiq in the fleet-wide rename of 2026-08-21, so
// `CnBuildiqEditButton` (exported above) is the canonical name. This alias
// re-exports the SAME component so the ~18 consuming apps that still import
// `CnOpenBuildEditButton` keep working. Documented on
// docs/components/cn-buildiq-edit-button.md; no separate doc page.
// @deprecated Use `CnBuildiqEditButton`.
export { CnOpenBuildEditButton } from './components/index.js'

// AI Chat Companion component family
export {
	CnAiCompanion,
	CnAiFloatingButton,
	CnAiChatPanel,
	CnAiMessageList,
	CnAiInput,
	CnAiAgentPicker,
	CnAiRecentSessions,
	CnAiHistoryList,
} from './components/CnAiCompanion/index.js'
export { default as CnAiHistoryDialog } from './dialogs/CnAiHistoryDialog.vue'

// Generic dialogs (NcDialog-based, one file per dialog — modal-isolation rule)
export { default as CnConfirmDialog } from './dialogs/CnConfirmDialog.vue'
export { default as CnTransitionInputDialog } from './dialogs/CnTransitionInputDialog.vue'
export { default as CnFlowEditModal } from './dialogs/CnFlowEditModal.vue'
export { default as CnFlowNodeEditModal } from './dialogs/CnFlowNodeEditModal.vue'

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
// AI Chat Companion backend config (single point for the chat backend app id)
export { DEFAULT_CHAT_APP_ID, chatApiBase, chatStreamUrl, chatSendUrl, chatHealthUrl, conversationsUrl, conversationMessagesUrl } from './composables/index.js'
export { useListView, useDetailView, useSubResource, useDashboardView, useContextMenu, clearContextMenuPositionDom, CTX_MENU_CSS_VAR_X, CTX_MENU_CSS_VAR_Y, CTX_MENU_DATA_ATTR, CTX_MENU_POPPER_ATTR, useAppManifest, useAppStatus, useAppInstaller, useSetupStatus, useWalkthrough, loadWalkthroughSeenVersion, persistWalkthroughSeenVersion, useGraphQL, useDataSource, selectByPath, buildCountQuery, buildBucketQuery, useBrokeredCall, useEndpointSource, fetchEndpointSource, invalidateEndpointSourceCache, useObjectSubscription, useObjectLock, LockConflictError, PermissionError, cnRenderMarkdown, useIntegrationRegistry, useRuntimeManifest, useSupportDialog, useClickDragGuard, useTenantContext, provideTenantContext, createTenantContext, TENANT_CONTEXT_KEY, useManifestEditor, useBuildiqEditAvailability, useManifestEditHistory, useCommandPalette, useScopedTheme } from './composables/index.js'
// Deprecated alias kept for consumers: OpenBuild was renamed to Buildiq in the
// fleet-wide rename of 2026-08-21. `useBuildiqEditAvailability` above is the
// canonical name; this alias keeps the ~18 consuming apps that still call
// `useOpenBuildEditAvailability` working.
// @deprecated Use `useBuildiqEditAvailability`.
export { useOpenBuildEditAvailability } from './composables/index.js'

// Command palette — the "objects" source adapter (see docs/utilities/create-object-search-source.md).
// `resolveManifestDetailRoute` is intentionally subpath-only (not re-exported here), same
// precedent as the NL-government icon sets below — import it directly from
// '@conduction/nextcloud-vue/src/utils/commandPaletteObjectSource.js' when you need it.
export { createObjectSearchSource } from './utils/commandPaletteObjectSource.js'

// Integration registry (pluggable integrations — sidebar tabs and widgets)
export { integrations, createIntegrationRegistry, installIntegrationRegistry, registerIntegration, getSharedRegistry, sharedRegistryIfInstalled, VALID_SURFACES, builtinIntegrations, registerBuiltinIntegrations, leafIntegrations, registerLeafIntegrations, registerIntegrationIcons, INTEGRATION_ICON_COMPONENTS } from './integrations/index.js'

// Every built-in integration descriptor, by name.
//
// This list used to hold two of the twenty-six (`talkIntegration`,
// `fieldInspectionIntegration`). The other twenty-four — `flowIntegration`
// among them — were defined, wired into `builtinIntegrations[]`, given bespoke
// tab/card components, and then unreachable from the package root. The failure
// is silent end to end: the named import resolves to `undefined`, the registry
// no-ops on an undefined descriptor, and the absent tab is indistinguishable
// from "that Nextcloud app isn't installed on this instance".
//
// `npm run check:integration-parity` fails when this list and
// `builtinIntegrations[]` disagree, so a descriptor added later cannot be
// half-shipped the same way.
export {
	filesIntegration,
	notesIntegration,
	tagsIntegration,
	tasksIntegration,
	auditTrailIntegration,
	versionHistoryIntegration,
	calendarIntegration,
	contactsIntegration,
	emailIntegration,
	talkIntegration,
	bookmarksIntegration,
	collectivesIntegration,
	mapsIntegration,
	photosIntegration,
	deckIntegration,
	pollsIntegration,
	sharesIntegration,
	activityIntegration,
	analyticsIntegration,
	cospendIntegration,
	flowIntegration,
	formsIntegration,
	timeTrackerIntegration,
	fieldInspectionIntegration,
	openprojectIntegration,
	xwikiIntegration,
} from './integrations/index.js'

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
export { useFlowStore } from './composables/useFlowStore.js'
export { registerFlowNodeEditor, resolveFlowNodeEditor, unregisterFlowNodeEditor } from './composables/useFlowNodeEditors.js'
export { useSuggestFeatureAction } from './composables/useSuggestFeatureAction.js'

// Utilities — Features & roadmap menu (add-features-roadmap-menu)
export { SAFE_MARKDOWN_DOMPURIFY_CONFIG } from './utils/safeMarkdownDompurifyConfig.js'
export { ROADMAP_LABEL_BLOCKLIST } from './utils/roadmapLabelBlocklist.js'

// Shared field validators. These are UX affordances that run in the browser —
// they do NOT replace server-side validation, which stays authoritative at the
// write boundary (OpenRegister's schema property validators). What they replace
// is a per-keystroke HTTP round trip to answer a question the browser can
// answer itself.
export {
	BSN_ERROR_CHECKSUM,
	BSN_ERROR_LENGTH,
	maskBsn,
	validateBsn,
} from './utils/validators/bsn.js'

// Localization
export { registerTranslations } from './l10n/index.js'

// Utilities
export { buildHeaders, buildQueryString, parseResponseError, parseAxiosError, networkError, genericError } from './utils/index.js'
export { cnFetch, cnFetchJson, CnHttpError } from './utils/cnFetch.js'
export { columnsFromSchema, formatValue, filtersFromSchema, fieldsFromSchema, validateValue } from './utils/index.js'
// The OpenRegister schema API contract — shared so Buildiq and OpenRegister cannot
// drift on what a 409 means (breaking change / schema still has objects).
export { saveSchema, deleteSchema, describeSchemaChange, SchemaBreakingChangeError, SchemaHasObjectsError } from './utils/index.js'
export { validateManifest, validateManifestV2 } from './utils/validateManifest.js'
export { resolveManifestSentinels, clearResolveCache } from './utils/resolveManifestSentinels.js'
export { resolveRouteSentinels, clearRouteSentinelWarnings } from './utils/resolveRouteSentinels.js'
export {
	SENTINEL_TOKEN_PATTERNS,
	SENTINEL_CONTEXTS,
	SENTINEL_VOCABULARY,
	SENTINEL_DEPRECATIONS,
	looksLikeSentinel,
	contextOf,
	isKnownToken,
	matchDeprecation,
	classifyToken,
	scanManifestTokens,
} from './utils/sentinelTokens.js'
export {
	SENTINEL_RESOLVERS,
	resolveManifestSubtree,
	warnIfDeprecated,
	clearDeprecationWarnings,
} from './utils/resolveManifestTokens.js'
export { filterWidgetsByVisibility, isWidgetVisible, getCurrentUserId, getCurrentUserGroups, resetVisibilityCache } from './utils/index.js'
export { safeHref, safeImageSrc, safeSvgPath } from './utils/index.js'
export { dispatchAction } from './utils/actionsDispatcher.js'
// Nested-modal stacking. `CnAppRoot` installs this itself; apps that do not
// mount `CnAppRoot` should call `installModalStack()` once from `main.js`, or
// two open dialogs tie on z-index and the lower one intercepts the clicks.
// The stack's internals (`acquireModalLayer`, `topModalZIndex`, …) stay
// module-private — import them from `src/utils/modalStack.js` if you need to
// slot something between two dialog layers.
export { installModalStack, uninstallModalStack } from './utils/modalStack.js'
export { placeNewWidget, getDashboardColumnOpts } from './utils/dashboardPlacement.js'
export { DASHBOARD_ICONS, DEFAULT_ICON, getIconComponent, isCustomIconUrl } from './components/CnIconPicker/index.js'
// NB: the NL-government icon sets are deliberately NOT re-exported here.
//
// `NL_DESIGN_ICONS` / `NL_DESIGN_ICON_GROUPS` / `rvoIcons` all reference RVO,
// whose 1164 icons are ~1.9MB of inlined data URIs. Re-exporting them from the
// barrel put that on the eager path of every consumer that imports ANYTHING from
// this package, and left it to each app's tree-shaking to prove the export was
// unused — which openbuild and pipelinq managed but LaunchPad did not, silently
// shipping the whole pack in its entry bundle.
//
// CnIconBrowser offers the sets by default (Gemeente + Den Haag eagerly at
// ~405KB; RVO behind an `import()`), so consumers need nothing. Anyone who
// genuinely wants the eager pack imports it by subpath:
//     import { NL_DESIGN_ICON_GROUPS } from '@conduction/nextcloud-vue/src/icons/index.js'
export { fromMdiJs, fromFontAwesome, fromOpenGemeenten, dedupeCatalogue } from './components/CnIconPicker/index.js'
export { mergeManifestDelta } from './utils/mergeManifestDelta.js'
export { buildManifest, applyMenuLayout, mergeMenuItems, mergePages, applyMenuRelocations, applyMenuRemovals, applySettingsSection } from './utils/buildManifest.js'
export { expandPageTemplates } from './utils/expandPageTemplates.js'
export { diffManifest } from './utils/diffManifest.js'
export { createManifestEditHistory } from './utils/manifestEditHistory.js'
export { resolveSlotColumns } from './utils/resolveSlotColumns.js'
// Dashboard widget library (cn-widget-library) — registry helpers + form composable.
export { dashboardWidgetRegistry, registerDashboardWidget, listWidgetTypes, getWidgetTypeEntry, getDefaultContent } from './components/CnWidgetGrid/dashboardWidgetRegistry.js'
export { registerBuiltinDashboardWidgets } from './components/CnWidgetGrid/registerDashboardWidgets.js'
export { useWidgetForm } from './composables/useWidgetForm.js'

// Errors
export { RegistryKindError } from './errors/RegistryKindError.js'

// V2 widget components are exported via the components barrel (src/components/index.js)
