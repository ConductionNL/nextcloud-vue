// Dashboard widget library (cn-widget-library) — public API. The 21 widget
// components self-register into dashboardWidgetRegistry via the side-effect
// import below and are resolved by type key, so they are not exported here.
import './CnWidgetGrid/registerDashboardWidgets.js'

export { CnDataTable } from './CnDataTable/index.js'
export { CnDataMatrix } from './CnDataMatrix/index.js'
export { CnFilterBar } from './CnFilterBar/index.js'
export { CnStatusBadge } from './CnStatusBadge/index.js'
export { CnPagination } from './CnPagination/index.js'
export { CnSettingsCard } from './CnSettingsCard/index.js'
export { CnSettingsSection } from './CnSettingsSection/index.js'
export { CnStatsBlock } from './CnStatsBlock/index.js'
export { CnStructuredDocReview } from './CnStructuredDocReview/index.js'
export { CnConfigurationCard } from './CnConfigurationCard/index.js'
export { CnVersionInfoCard } from './CnVersionInfoCard/index.js'
export { CnAdminSettingsShell } from './CnAdminSettingsShell/index.js'
export { CnCellRenderer } from './CnCellRenderer/index.js'
export { CnObjectCard } from './CnObjectCard/index.js'
export { CnCardGrid } from './CnCardGrid/index.js'
export { CnObjectRow } from './CnObjectRow/index.js'
export { CnObjectList } from './CnObjectList/index.js'
export { CnObjectKanban } from './CnObjectKanban/index.js'
export { CnObjectCalendar } from './CnObjectCalendar/index.js'
export { CnFolderTree } from './CnFolderTree/index.js'
export { CnFolderSidebar, fetchWebdavFolderTree } from './CnFolderSidebar/index.js'
export { CnFacetSidebar } from './CnFacetSidebar/index.js'
export { CnFederationStatus } from './CnFederationStatus/index.js'
export { CnRowActions } from './CnRowActions/index.js'
export { CnContextMenu } from './CnContextMenu/index.js'
export { CnIndexPage } from './CnIndexPage/index.js'
export { CnQuickFilterBar } from './CnQuickFilterBar/index.js'
export { CnMarkdownEditor } from './CnMarkdownEditor/index.js'
export { CnMassActionBar } from './CnMassActionBar/index.js'
export { CnDeleteDialog } from './CnDeleteDialog/index.js'
export { CnCopyDialog } from './CnCopyDialog/index.js'
export { CnFormDialog } from './CnFormDialog/index.js'
export { CnFormBuilder } from './CnFormBuilder/index.js'
export { CnAdvancedFormDialog, CnPropertiesTab, CnMetadataTab, CnPropertyValueCell } from './CnAdvancedFormDialog/index.js'
export { CnMassDeleteDialog } from './CnMassDeleteDialog/index.js'
export { CnMassCopyDialog } from './CnMassCopyDialog/index.js'
export { CnKpiGrid } from './CnKpiGrid/index.js'
export { CnMassExportDialog } from './CnMassExportDialog/index.js'
export { CnMassImportDialog } from './CnMassImportDialog/index.js'
export { CnExportWizard } from './CnExportWizard/index.js'
export { CnWizardDialog } from './CnWizardDialog/index.js'
export { CnSetupWizard } from './CnSetupWizard/index.js'
export { CnWalkthrough } from './CnWalkthrough/index.js'
export { CnRichSubmitDialog } from './CnRichSubmitDialog/index.js'
export { CnSignatureCapture } from './CnSignatureCapture/index.js'
export { CnIndexSidebar } from './CnIndexSidebar/index.js'
export { CnRegisterMapping } from './CnRegisterMapping/index.js'
export { CnRegisterSchemaSelect } from './CnRegisterSchemaSelect/index.js'
export { CnThemePreview } from './CnThemePreview/index.js'
export { CnRelationshipGraph } from './CnRelationshipGraph/index.js'
export { CnGraphCanvas } from './CnGraphCanvas/index.js'
export { CnIcon, ICON_MAP, registerIcons } from './CnIcon/index.js'
export {
	SEMANTIC_ICONS,
	SEMANTIC_ICONS_TIER_A,
	SEMANTIC_ICONS_TIER_B,
	SEMANTIC_ICON_TIERS,
	SEMANTIC_ICON_COMPONENTS,
	conceptForIcon,
	getSemanticIconComponent,
} from './CnIcon/semanticIcons.js'
export { CnPageHeader } from './CnPageHeader/index.js'
export { CnActionsBar } from './CnActionsBar/index.js'
export { CnActionsMenu } from './CnActionsMenu/index.js'
export { CnActionButtons } from './CnActionButtons/index.js'
export { CnDetailPage } from './CnDetailPage/index.js'
export { CnLifecycleActions } from './CnLifecycleActions/index.js'
export { CnSummaryAggregates } from './CnSummaryAggregates/index.js'
export { CnRelatedCollections } from './CnRelatedCollections/index.js'
export { CnBodySections } from './CnBodySections/index.js'
export { CnDashboardPage } from './CnDashboardPage/index.js'
export { CnDashboardGrid } from './CnDashboardGrid/index.js'
export { CnWidgetWrapper } from './CnWidgetWrapper/index.js'
export { CnWidgetEditCog } from './CnWidgetEditCog/index.js'
export { CnIconPicker, CnDashboardIcon } from './CnIconPicker/index.js'
export { CnIconBrowser, mdiCatalogue, vmdiCatalogue } from './CnIconBrowser/index.js'
export { CnWidgetRenderer } from './CnWidgetRenderer/index.js'
export { CnTileWidget } from './CnTileWidget/index.js'
export { CnTimelineView } from './CnTimelineView/index.js'
export { CnItemCard } from './CnItemCard/index.js'
export { CnSchemaFormDialog } from './CnSchemaFormDialog/index.js'
export { CnSavedViewsControl } from './CnSavedViewsControl/index.js'
export { CnSaveViewDialog } from './CnSaveViewDialog/index.js'
export { CnSearchPage } from './CnSearchPage/index.js'
export { CnCommandPalette } from './CnCommandPalette/index.js'
export { CnTabbedFormDialog } from './CnTabbedFormDialog/index.js'
export { CnTimelineStages } from './CnTimelineStages/index.js'
export { CnTreeView } from './CnTreeView/index.js'
export { CnUserActionMenu } from './CnUserActionMenu/index.js'
export { CnNotesCard } from './CnNotesCard/index.js'
export { CnTasksCard } from './CnTasksCard/index.js'
export { CnFilesCard } from './CnFilesCard/index.js'
export { CnFileManager } from './CnFileManager/index.js'
export { CnRelatedFiles } from './CnRelatedFiles/index.js'
export { CnTagsCard } from './CnTagsCard/index.js'
export { CnAuditTrailCard } from './CnAuditTrailCard/index.js'
export { CnVersionHistory } from './CnVersionHistory/index.js'
export { default as CnEmailCard } from '../integrations/builtin/email/CnEmailCard.vue'
export { default as CnEmailTab } from '../integrations/builtin/email/CnEmailTab.vue'
export { default as CnContactsCard } from '../integrations/builtin/contacts/CnContactsCard.vue'
export { default as CnContactsTab } from '../integrations/builtin/contacts/CnContactsTab.vue'
export { CnContactPicker } from './CnContactPicker/index.js'
export { CnContactCreate } from './CnContactCreate/index.js'
export { CnResourceSelect } from './CnResourceSelect/index.js'
export { CnIntegrationTab } from './CnIntegrationTab/index.js'
export { CnIntegrationCard } from './CnIntegrationCard/index.js'
export { CnIntegrationWidgetGrid } from './CnIntegrationWidgetGrid/index.js'
export { CnIntegrationWidget } from './CnIntegrationWidget/index.js'
export { CnLeafMountHost } from './CnLeafMountHost/index.js'
export { CnDetailCard } from './CnDetailCard/index.js'
export { CnCard } from './CnCard/index.js'
export { CnStatsPanel } from './CnStatsPanel/index.js'
export { CnJsonViewer } from './CnJsonViewer/index.js'
export { CnColorPicker } from './CnColorPicker/index.js'
export { CnDetailGrid } from './CnDetailGrid/index.js'
export { CnProgressBar } from './CnProgressBar/index.js'
export { CnChartWidget } from './CnChartWidget/index.js'
// Dashboard widget library (v2) — renderers + their config forms. Consumed by
// LaunchPad's widget registry; data-driven widgets take a dataSource /
// cn*Source injection or *Endpoint builder so they stay app-agnostic.
export { CnLabelWidget } from './CnLabelWidget/index.js'
export { CnLabelWidgetForm } from './CnLabelWidgetForm/index.js'
export { CnTextWidget } from './CnTextWidget/index.js'
export { CnTextWidgetForm } from './CnTextWidgetForm/index.js'
export { CnImageWidget } from './CnImageWidget/index.js'
export { CnImageWidgetForm } from './CnImageWidgetForm/index.js'
export { CnLinkButtonWidget } from './CnLinkButtonWidget/index.js'
export { CnLinkButtonWidgetForm } from './CnLinkButtonWidgetForm/index.js'
export { CnHeaderWidget } from './CnHeaderWidget/index.js'
export { CnHeaderWidgetForm } from './CnHeaderWidgetForm/index.js'
export { CnDividerWidget } from './CnDividerWidget/index.js'
export { CnDividerWidgetForm } from './CnDividerWidgetForm/index.js'
export { CnFilesWidget } from './CnFilesWidget/index.js'
export { CnFilesWidgetForm } from './CnFilesWidgetForm/index.js'
export { CnPeopleWidget } from './CnPeopleWidget/index.js'
export { CnPeopleWidgetForm } from './CnPeopleWidgetForm/index.js'
export { CnNewsWidget } from './CnNewsWidget/index.js'
export { CnNewsWidgetForm } from './CnNewsWidgetForm/index.js'
export { CnQuicklinksWidget } from './CnQuicklinksWidget/index.js'
export { CnQuicklinksWidgetForm } from './CnQuicklinksWidgetForm/index.js'
export { CnLinksWidget } from './CnLinksWidget/index.js'
export { CnLinksWidgetForm } from './CnLinksWidgetForm/index.js'
export { CnMenuWidget } from './CnMenuWidget/index.js'
export { CnMenuWidgetForm } from './CnMenuWidgetForm/index.js'
export { CnContainerWidget } from './CnContainerWidget/index.js'
export { CnContainerWidgetForm } from './CnContainerWidgetForm/index.js'
export { CnVideoWidget } from './CnVideoWidget/index.js'
export { CnVideoWidgetForm } from './CnVideoWidgetForm/index.js'
export { CnCalendarWidget } from './CnCalendarWidget/index.js'
export { CnCalendarWidgetForm } from './CnCalendarWidgetForm/index.js'
export { CnSpendAnalyticsWidget } from './CnSpendAnalyticsWidget/index.js'
export { CnSpendAnalyticsWidgetForm } from './CnSpendAnalyticsWidgetForm/index.js'
export { CnNcWidgetWidget } from './CnNcWidgetWidget/index.js'
export { CnNcDashboardWidgetForm } from './CnNcDashboardWidgetForm/index.js'
export { CnDashTileWidget } from './CnDashTileWidget/index.js'
export { CnDashTileWidgetForm } from './CnDashTileWidgetForm/index.js'
export { CnDateRangePicker, DEFAULT_DATE_RANGE_PRESETS, resolvePresetWindow } from './CnDateRangePicker/index.js'
export { CnStatsBlockWidget } from './CnStatsBlockWidget/index.js'
// Analytics widget library — OpenRegister-data-driven renderers + their config
// forms (KPI/delta/gauge/object-list/chart/stats-card/table). Each renderer
// fetches its own OR aggregate at runtime via generateUrl; the forms self-fetch
// schema properties. Consumed by LaunchPad's widget registry.
export { CnStatWidget } from './CnStatWidget/index.js'
export { CnStatWidgetForm } from './CnStatWidgetForm/index.js'
export { CnDeltaWidget } from './CnDeltaWidget/index.js'
export { CnDeltaWidgetForm } from './CnDeltaWidgetForm/index.js'
export { CnGaugeWidget } from './CnGaugeWidget/index.js'
export { CnGaugeWidgetForm } from './CnGaugeWidgetForm/index.js'
export { CnObjectListWidget } from './CnObjectListWidget/index.js'
export { CnObjectListWidgetForm } from './CnObjectListWidgetForm/index.js'
export { CnChartWidgetForm } from './CnChartWidgetForm/index.js'
export { CnStatsBlockWidgetForm } from './CnStatsBlockWidgetForm/index.js'
export { CnLockedBanner } from './CnLockedBanner/index.js'
export { CnObjectSidebar } from './CnObjectSidebar/index.js'
export { CnInfoWidget } from './CnInfoWidget/index.js'
export { CnTableWidget } from './CnTableWidget/index.js'
export { CnNoteCard } from './CnNoteCard/index.js'
export { CnObjectDataWidget } from './CnObjectDataWidget/index.js'
export { CnObjectMetadataWidget } from './CnObjectMetadataWidget/index.js'
export { CnObjectMetadataModal } from './CnObjectMetadataModal/index.js'
export { CnRelatedObjectsWidget } from './CnRelatedObjectsWidget/index.js'
export { CnObjectGeoWidget } from './CnObjectGeoWidget/index.js'
export { CnLogsPage } from './CnLogsPage/index.js'
export { CnSettingsPage } from './CnSettingsPage/index.js'
export { CnChatPage } from './CnChatPage/index.js'
export { CnFilesPage } from './CnFilesPage/index.js'
export { CnFormPage } from './CnFormPage/index.js'
export { CnMapWidget } from './CnMapWidget/index.js'
export { CnMapPage } from './CnMapPage/index.js'
export { CnWikiPage } from './CnWikiPage/index.js'
export { default as CnWidgetRefItem } from './CnWidgetRefItem/index.js'
export { CnPageRenderer, defaultPageTypes } from './CnPageRenderer/index.js'
export { CnAppNav } from './CnAppNav/index.js'
export { CnAppLoading } from './CnAppLoading/index.js'
export { CnDependencyMissing } from './CnDependencyMissing/index.js'
export { CnAppRoot } from './CnAppRoot/index.js'
export { CnTenantBadge } from './CnTenantBadge/index.js'
export { CnTranslatedBadge } from './CnTranslatedBadge/index.js'

// V2 widget components (manifest-v2-renderer)
export { default as CnWidgetGrid } from './CnWidgetGrid/CnWidgetGrid.vue'
export { default as CnWidgetObjectTable } from './CnWidgetObjectTable/CnWidgetObjectTable.vue'
export { default as CnWidgetFormRenderer } from './CnWidgetFormRenderer/CnWidgetFormRenderer.vue'
export { default as CnWidgetMapViewer } from './CnWidgetMapViewer/CnWidgetMapViewer.vue'
export { default as CnWidgetCardGrid } from './CnWidgetCardGrid/CnWidgetCardGrid.vue'

// Features & roadmap menu (add-features-roadmap-menu)
export { CnFeaturesAndRoadmapLink } from './CnFeaturesAndRoadmapLink/index.js'
export { CnFeaturesAndRoadmapPage } from './CnFeaturesAndRoadmapPage/index.js'
export { CnFeaturesAndRoadmapSidebar } from './CnFeaturesAndRoadmapSidebar/index.js'
export { CnFeaturesAndRoadmapView } from './CnFeaturesAndRoadmapView/index.js'
export { CnSupportDialog } from './CnSupportDialog/index.js'
export { CnNotificationPreferences } from './CnNotificationPreferences/index.js'
export { CnCredentials } from './CnCredentials/index.js'
export { CnFeaturesTab } from './CnFeaturesTab/index.js'
export { CnRoadmapTab } from './CnRoadmapTab/index.js'
export { CnRoadmapItem } from './CnRoadmapItem/index.js'
export { CnSuggestFeatureModal } from './CnSuggestFeatureModal/index.js'
// Deck integration leaf (Tier-2)
export { CnDeckCardPicker } from './CnDeckCardPicker/index.js'
export { CnDeckCardCreate } from './CnDeckCardCreate/index.js'

// Calendar integration leaf (Tier-2)
export { CnCalendarEventPicker } from './CnCalendarEventPicker/index.js'
export { CnCalendarEventCreate } from './CnCalendarEventCreate/index.js'

// Email integration leaf (Tier-2)
export { CnEmailPicker } from './CnEmailPicker/index.js'

// Polls integration leaf (Tier-2)
export { CnPollPicker } from './CnPollPicker/index.js'
export { CnPollCreate } from './CnPollCreate/index.js'

// Talk integration leaf (Tier-2)
export { CnTalkRoomPicker } from './CnTalkRoomPicker/index.js'
export { CnTalkRoomCreate } from './CnTalkRoomCreate/index.js'

// Shares integration leaf (Tier-2) — create-only (no picker)
export { CnShareCreate } from './CnShareCreate/index.js'

// Flow integration leaf (Tier-2)
export { CnFlowOperationPicker } from './CnFlowOperationPicker/index.js'

// Photos integration leaf (Tier-2)
export { CnPhotoAlbumPicker } from './CnPhotoAlbumPicker/index.js'
export { CnPhotoAlbumCreate } from './CnPhotoAlbumCreate/index.js'

// Bookmarks integration leaf (Tier-2)
export { CnBookmarkPicker } from './CnBookmarkPicker/index.js'
export { CnBookmarkCreate } from './CnBookmarkCreate/index.js'

// Collectives integration leaf (Tier-2)
export { CnCollectivePagePicker } from './CnCollectivePagePicker/index.js'
export { CnCollectivePageCreate } from './CnCollectivePageCreate/index.js'

// XWiki integration leaf (Tier-2)
export { CnXwikiPagePicker } from './CnXwikiPagePicker/index.js'
export { CnXwikiPageCreate } from './CnXwikiPageCreate/index.js'

// Maps integration leaf (Tier-2)
export { CnMapPoiPicker } from './CnMapPoiPicker/index.js'
export { CnMapPoiCreate } from './CnMapPoiCreate/index.js'

// OpenProject integration leaf (Tier-2)
export { CnOpenProjectPicker } from './CnOpenProjectPicker/index.js'
export { CnOpenProjectCreate } from './CnOpenProjectCreate/index.js'

// Analytics integration leaf (Tier-2)
export { CnAnalyticsReportPicker } from './CnAnalyticsReportPicker/index.js'
export { CnAnalyticsReportCreate } from './CnAnalyticsReportCreate/index.js'

// Cospend integration leaf (Tier-2)
export { CnCospendPicker } from './CnCospendPicker/index.js'
export { CnCospendCreate } from './CnCospendCreate/index.js'

// Time-tracker integration leaf (Tier-2)
export { CnTimeTrackerPicker } from './CnTimeTrackerPicker/index.js'
export { CnTimeTrackerCreate } from './CnTimeTrackerCreate/index.js'

// OpenBuild in-app edit shell (ADR-041).
//
// These live in src/dialogs/ now — they are NcDialog-based, and ADR-004 puts
// NcDialog components there and NcModal ones in src/modals/. The exported NAMES
// keep their `…Modal` suffix so no consumer import breaks; only the path moved.
export { CnOpenBuildEditButton } from './CnOpenBuildEditButton/index.js'
export { default as CnEditMenuModal } from '../dialogs/CnEditMenuModal.vue'
export { default as CnEditPagesModal } from '../dialogs/CnEditPagesModal.vue'
export { default as CnEditSettingsModal } from '../dialogs/CnEditSettingsModal.vue'
export { default as CnEditSidebarModal } from '../dialogs/CnEditSidebarModal.vue'
export { default as CnEditActionsModal } from '../dialogs/CnEditActionsModal.vue'
export { default as CnAddWidgetModal } from '../dialogs/CnAddWidgetModal.vue'
export { default as CnWidgetStyleEditorModal } from '../dialogs/CnWidgetStyleEditorModal.vue'
export { default as CnWidgetVisibilityRulesModal } from '../dialogs/CnWidgetVisibilityRulesModal.vue'
export { default as CnRelationLinkModal } from '../dialogs/CnRelationLinkModal.vue'
export { CnMenuItemEditor } from './CnMenuItemEditor/index.js'
export { CnTextTableEditor } from './CnTextTableEditor/index.js'
export { CnNcWidgetGridPicker } from './CnNcWidgetGridPicker/index.js'
