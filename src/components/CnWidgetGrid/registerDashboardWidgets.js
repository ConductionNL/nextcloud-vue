/**
 * Side-effect aggregator for the cn-widget-library dashboard widget catalog.
 *
 * Importing this module imports every migrated widget's `index.js`, each of
 * which self-registers its `{ renderer, form, defaultContent, displayName,
 * icon }` into `dashboardWidgetRegistry` at load time. The library barrel
 * imports this module so the catalog is populated whenever a consuming app
 * imports `@conduction/nextcloud-vue`; `CnWidgetGrid` then resolves widgets by
 * type key and `CnAddWidgetModal` lists the addable types.
 *
 * Renderers and forms are registered as `lazyComponent()` loaders, so a
 * widget's code is fetched with the first placement of its type, not with the
 * bundle that imports the library.
 *
 * The individual widget components are intentionally NOT public exports — they
 * are resolved by their registry type key (the whole point of the registry),
 * so consumers reference them via the manifest `widgetKey`, not by import.
 *
 * @module components/CnWidgetGrid/registerDashboardWidgets
 */

// Typed widgets registered with an explicit renderer + config FORM. chart /
// stats-block render through CnDashboardPage's own isChart()/isStatsBlock()
// branches and `related` through CnDetailPage's isRelatedWidget() branch — the
// registry entry exists so the cog editor + Add-widget picker get a form (and,
// for `related`, the detail-page surface). `table` aliases the object-list
// renderer/form for legacy manifests using type:'table'.
import { lazyComponent } from '../../utils/lazyComponent.js'
import { registerDashboardWidget } from './dashboardWidgetRegistry.js'

import '../CnLabelWidget/index.js'
import '../CnTextWidget/index.js'
import '../CnImageWidget/index.js'
import '../CnLinkButtonWidget/index.js'
import '../CnDividerWidget/index.js'
import '../CnHeaderWidget/index.js'
import '../CnQuicklinksWidget/index.js'
import '../CnVideoWidget/index.js'
import '../CnDashTileWidget/index.js'
import '../CnLinksWidget/index.js'
import '../CnMenuWidget/index.js'
import '../CnContainerWidget/index.js'
import '../CnFilesWidget/index.js'
import '../CnPeopleWidget/index.js'
import '../CnCalendarWidget/index.js'
import '../CnNcWidgetWidget/index.js'
import '../CnSpendAnalyticsWidget/index.js'
import '../CnStatWidget/index.js'
import '../CnDeltaWidget/index.js'
import '../CnGaugeWidget/index.js'
import '../CnFlowRunsWidget/index.js'
import '../CnTasksWidget/index.js'
import '../CnSectionsWidget/index.js'
import '../CnFactsWidget/index.js'
import '../CnHandoffAction/index.js'
import '../CnLinkedWidget/index.js'
import '../CnDeviceFramesWidget/index.js'
import '../CnGroupedCardsWidget/index.js'
import '../CnChecklistRunWidget/index.js'
import '../CnChecklistWidget/index.js'
import '../CnRecordNotesWidget/index.js'
import '../CnMailTab/dashboardRegistration.js'
import '../CnWorkingCalendarWidget/index.js'
import '../CnPartyActionsWidget/index.js'
import '../CnFieldListWidget/index.js'
import '../CnFieldGroupsWidget/index.js'
import '../CnObjectLinksWidget/index.js'
import '../CnSettingsFormWidget/index.js'
import '../CnSwitchRowsWidget/index.js'
import '../CnRadioCardsWidget/index.js'
import '../CnChipsFieldWidget/index.js'
import '../CnToggleTableWidget/index.js'
import '../CnRowMarkList/index.js'
import '../CnSlotGrid/index.js'
import '../CnChoicePickerWidget/index.js'
import '../CnConflictResolveCard/index.js'
import '../CnShareList/index.js'
import '../CnTaskFormWidget/index.js'
import '../CnRecordListWidget/index.js'
import '../CnIndexListWidget/index.js'
import '../CnStatGridWidget/index.js'
import '../CnSavedViewsWidget/index.js'
import '../CnNotepadWidget/index.js'
import '../CnCodeWidget/index.js'
import '../CnAppTilesWidget/index.js'
import '../CnAppTileWidget/index.js'
import '../CnObjectDataWidget/dashboardRegistration.js'
import '../CnObjectGeoWidget/dashboardRegistration.js'
import '../CnWidgetObjectTable/dashboardRegistration.js'
import '../CnAuditTrailWidget/dashboardRegistration.js'
import '../CnTimelineWidget/dashboardRegistration.js'
import '../CnActionTilesWidget/index.js'
import '../CnKbSearchWidget/index.js'
import '../CnInteractionFormWidget/index.js'
import '../CnCreateFormWidget/index.js'
import '../CnBannerWidget/index.js'
import '../CnAttentionFlagWidget/index.js'
import '../CnStatusExplainerWidget/index.js'
import '../CnObjectPartiesWidget/index.js'
import '../CnWorkspaceFilterWidget/index.js'

const LazyCnAiChatWidget = lazyComponent(() => import('../CnAiCompanion/CnAiChatWidget.vue'), 'CnAiChatWidget')
const LazyCnChartWidget = lazyComponent(() => import('../CnChartWidget/CnChartWidget.vue'), 'CnChartWidget')
const LazyCnChartWidgetForm = lazyComponent(() => import('../CnChartWidgetForm/CnChartWidgetForm.vue'), 'CnChartWidgetForm')
const LazyCnConversationWidget = lazyComponent(() => import('../CnConversationThread/CnConversationWidget.vue'), 'CnConversationWidget')
const LazyCnCountdownWidget = lazyComponent(() => import('../CnCountdownWidget/CnCountdownWidget.vue'), 'CnCountdownWidget')
const LazyCnCountdownWidgetForm = lazyComponent(() => import('../CnCountdownWidgetForm/CnCountdownWidgetForm.vue'), 'CnCountdownWidgetForm')
const LazyCnDocumentReviewWidget = lazyComponent(() => import('../CnDocumentReviewList/CnDocumentReviewWidget.vue'), 'CnDocumentReviewWidget')
const LazyCnEventsCard = lazyComponent(() => import('../CnEventsCard/CnEventsCard.vue'), 'CnEventsCard')
const LazyCnMacrosWidget = lazyComponent(() => import('../CnMacrosWidget/CnMacrosWidget.vue'), 'CnMacrosWidget')
const LazyCnMapWidget = lazyComponent(() => import('../CnMapWidget/CnMapWidget.vue'), 'CnMapWidget')
const LazyCnMapWidgetForm = lazyComponent(() => import('../CnMapWidgetForm/CnMapWidgetForm.vue'), 'CnMapWidgetForm')
const LazyCnMarkdownWidget2 = lazyComponent(() => import('../CnMarkdownWidget/CnMarkdownWidget.vue'), 'CnMarkdownWidget')
const LazyCnMarkdownWidgetForm2 = lazyComponent(() => import('../CnMarkdownWidgetForm/CnMarkdownWidgetForm.vue'), 'CnMarkdownWidgetForm')
const LazyCnNextStepWidget = lazyComponent(() => import('../CnNextStepCard/CnNextStepWidget.vue'), 'CnNextStepWidget')
const LazyCnObjectListWidget2 = lazyComponent(() => import('../CnObjectListWidget/CnObjectListWidget.vue'), 'CnObjectListWidget')
const LazyCnObjectListWidgetForm2 = lazyComponent(() => import('../CnObjectListWidgetForm/CnObjectListWidgetForm.vue'), 'CnObjectListWidgetForm')
const LazyCnPlanWidget = lazyComponent(() => import('../CnPlanWidget/CnPlanWidget.vue'), 'CnPlanWidget')
const LazyCnRelatedObjectsWidget = lazyComponent(() => import('../CnRelatedObjectsWidget/CnRelatedObjectsWidget.vue'), 'CnRelatedObjectsWidget')
const LazyCnRelatedObjectsWidgetForm = lazyComponent(() => import('../CnRelatedObjectsWidgetForm/CnRelatedObjectsWidgetForm.vue'), 'CnRelatedObjectsWidgetForm')
const LazyCnRetentionWidget = lazyComponent(() => import('../CnRetentionWidget/CnRetentionWidget.vue'), 'CnRetentionWidget')
const LazyCnSavedViewWidget2 = lazyComponent(() => import('../CnSavedViewWidget/CnSavedViewWidget.vue'), 'CnSavedViewWidget')
const LazyCnSavedViewWidgetForm2 = lazyComponent(() => import('../CnSavedViewWidgetForm/CnSavedViewWidgetForm.vue'), 'CnSavedViewWidgetForm')
const LazyCnSchemaRulesWidget = lazyComponent(() => import('../CnSchemaRulesWidget/CnSchemaRulesWidget.vue'), 'CnSchemaRulesWidget')
const LazyCnStackedBarWidget = lazyComponent(() => import('../CnStackedBarWidget/CnStackedBarWidget.vue'), 'CnStackedBarWidget')
const LazyCnStackedBarWidgetForm = lazyComponent(() => import('../CnStackedBarWidgetForm/CnStackedBarWidgetForm.vue'), 'CnStackedBarWidgetForm')
const LazyCnStagesWidget = lazyComponent(() => import('../CnStagesWidget/CnStagesWidget.vue'), 'CnStagesWidget')
const LazyCnStagesWidgetForm = lazyComponent(() => import('../CnStagesWidgetForm/CnStagesWidgetForm.vue'), 'CnStagesWidgetForm')
const LazyCnStatsBlockWidget = lazyComponent(() => import('../CnStatsBlockWidget/CnStatsBlockWidget.vue'), 'CnStatsBlockWidget')
const LazyCnStatsBlockWidgetForm = lazyComponent(() => import('../CnStatsBlockWidgetForm/CnStatsBlockWidgetForm.vue'), 'CnStatsBlockWidgetForm')
const LazyCnTabsWidget = lazyComponent(() => import('../CnTabsWidget/CnTabsWidget.vue'), 'CnTabsWidget')
const LazyCnTabsWidgetForm = lazyComponent(() => import('../CnTabsWidgetForm/CnTabsWidgetForm.vue'), 'CnTabsWidgetForm')
const LazyCnTeamWorkloadWidget = lazyComponent(() => import('../CnTeamWorkloadWidget/CnTeamWorkloadWidget.vue'), 'CnTeamWorkloadWidget')
const LazyCnWeekStripWidget = lazyComponent(() => import('../CnWeekStripWidget/CnWeekStripWidget.vue'), 'CnWeekStripWidget')
const LazyCnWeekStripWidgetForm = lazyComponent(() => import('../CnWeekStripWidgetForm/CnWeekStripWidgetForm.vue'), 'CnWeekStripWidgetForm')
const LazyCnWorkQueue = lazyComponent(() => import('../CnWorkQueue/CnWorkQueue.vue'), 'CnWorkQueue')

registerDashboardWidget('chart', {
	renderer: LazyCnChartWidget,
	form: LazyCnChartWidgetForm,
	defaultContent: {
		chartKind: 'area',
		dataSource: { register: '', schema: '', filter: {}, bucket: { field: '', interval: 'month', metric: 'count', metricField: '' } },
	},
	displayName: 'Chart',
	icon: 'ChartLine',
})

registerDashboardWidget('stats-block', {
	renderer: LazyCnStatsBlockWidget,
	form: LazyCnStatsBlockWidgetForm,
	defaultContent: {
		title: '',
		props: { countLabel: '', variant: 'default', iconClass: '' },
		dataSource: { register: '', schema: '', metric: 'count', field: '', filter: {} },
	},
	displayName: 'Statistic card',
	icon: 'ChartBar',
	// Card family (docs/architecture/cards-and-widgets.md), like `stat` and
	// `delta`: the tile headlines itself with its own title, so the wrapper
	// renders no header of its own and would otherwise show the title twice.
	card: true,
})

// `table` and `object-list` (below) are legacy aliases of `object-table` — same
// config form (CnObjectListWidgetForm), same job. They stay registered so
// existing placements keep rendering, but are hidden from every Add-widget
// picker via a sentinel surface no picker queries (see widgetTypeAllowsSurface):
// `object-table` is the one to add now. Rendering resolves through
// getWidgetTypeEntry, which ignores `surfaces`, so hidden ≠ broken.
registerDashboardWidget('table', {
	renderer: LazyCnObjectListWidget2,
	form: LazyCnObjectListWidgetForm2,
	defaultContent: {
		register: '',
		schema: '',
		filter: {},
		sort: { field: '', dir: 'asc' },
		limit: 10,
		columns: [],
	},
	displayName: 'Table',
	icon: 'ClipboardList',
	surfaces: ['legacy'],
})

// `object-list` is registered HERE and only here. Registering it from
// CnObjectListWidget/index.js instead is not enough: package.json declares
// `sideEffects: ["**/*.css"]` (ADR-061 tree-shaking), which lets
// rollup/webpack legally DROP bare imports of side-effect-free JS modules —
// the dist bundle shipped without the object-list registration and every
// manifest `type:"object-list"` widget rendered blank. Inline calls in this
// module survive because consumers import live bindings from the registry.
//
// That index.js ALSO self-registered, with a divergent entry (limit 5, no
// `surfaces`), so both ran in a consumer's build — components/index.js
// re-exports it, so it was never tree-shaken — and last-registration-wins
// decided whether this legacy alias stayed hidden from the Add-widget picker.
// The self-registration is gone; this entry is the one that already won.
registerDashboardWidget('object-list', {
	renderer: LazyCnObjectListWidget2,
	form: LazyCnObjectListWidgetForm2,
	defaultContent: {
		register: '',
		schema: '',
		filter: {},
		sort: { field: '', dir: 'asc' },
		limit: 25,
		columns: [],
	},
	displayName: 'Object list',
	icon: 'ClipboardList',
	surfaces: ['legacy'],
})

// `saved-view`: a list driven by one of the reader's saved views. The only data
// widget a user may add themselves, because the view carries the register and
// schema a user would otherwise have to name. Registered inline for the same
// tree-shaking reason as `object-list` above.
// @spec openspec/changes/a-saved-view-drives-a-widget/tasks.md#task-1.1
registerDashboardWidget('saved-view', {
	renderer: LazyCnSavedViewWidget2,
	form: LazyCnSavedViewWidgetForm2,
	defaultContent: { viewId: '', limit: 10 },
	displayName: 'Saved view',
	icon: 'ClipboardList',
	userAddable: true,
})

// `markdown`: prose inside a grid page, through the one shared renderer. The
// only catalog widget a PUBLIC host may mount so far: every other entry is
// `public: false` until its author opts in deliberately.
// @spec openspec/changes/widget-registry-public-flag/tasks.md#task-4
registerDashboardWidget('markdown', {
	renderer: LazyCnMarkdownWidget2,
	form: LazyCnMarkdownWidgetForm2,
	defaultContent: { markdown: '' },
	displayName: 'Markdown',
	icon: 'FormatTitle',
	public: true,
})

registerDashboardWidget('related', {
	renderer: LazyCnRelatedObjectsWidget,
	form: LazyCnRelatedObjectsWidgetForm,
	defaultContent: { title: '', groups: [], hideSingleTabTitle: true, showTotalCount: true },
	displayName: 'Object relations',
	icon: 'FileTreeOutline',
	surfaces: ['detail-page'],
	ownsTitle: true,
})

// `map` is registered here for the same tree-shaking reason as `object-list`
// above — a bare `import '../CnMapWidget/index.js'` is a side-effect-free JS module
// as far as the bundler is concerned, so it may legally be dropped and the widget
// would silently never appear in Add Widget. CnMapWidget/index.js carried a
// byte-identical copy of this entry, which only produced a duplicate-registration
// warning on every consumer's boot; it no longer registers.
registerDashboardWidget('map', {
	renderer: LazyCnMapWidget,
	form: LazyCnMapWidgetForm,
	defaultContent: {
		register: '',
		schema: '',
		// The Netherlands, roughly — only visible until autoFit frames the objects.
		center: [52.13, 5.29],
		zoom: 7,
		height: '400px',
		popupField: '',
		clustering: false,
		autoFit: true,
		// A map with no tile layer renders as a grey box. `basemaps` is opt-in and
		// empty by default (so consumers declaring a `tile` entry in `layers` are
		// unaffected), which meant a freshly-placed Map widget had NO background at
		// all. Ship OpenStreetMap — the Nextcloud CSP already allows *.tile.openstreetmap.org.
		basemaps: [
			{
				name: 'OpenStreetMap',
				url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
				attribution: '© OpenStreetMap contributors',
				options: { maxZoom: 19 },
			},
		],
		markers: {
			dataSource: { register: '', schema: '' },
			popupField: '',
			clustering: false,
		},
	},
	displayName: 'Map',
	icon: 'Map',
})

registerDashboardWidget('countdown', {
	renderer: LazyCnCountdownWidget,
	form: LazyCnCountdownWidgetForm,
	defaultContent: {
		label: '',
		field: '',
		icon: 'ClockOutline',
		thresholds: {},
		showDate: true,
	},
	displayName: 'Countdown',
	icon: 'ClockOutline',
	// Card family: the tile headlines itself, so the wrapper draws no header.
	card: true,
	// It reads a date off the BOUND RECORD, which only a detail page has.
	surfaces: ['detail-page'],
})

// The case surfaces (detail-action-model-and-case-surfaces). Each reads the
// BOUND RECORD, which only a detail page has, and none has a config form yet,
// so `form: null` keeps them out of the Add-widget picker: they are placed
// from the manifest. Registered inline for the same tree-shaking reason as
// `map` above.
registerDashboardWidget('next-step', {
	renderer: LazyCnNextStepWidget,
	form: null,
	defaultContent: { field: 'status', stages: {} },
	displayName: 'Next step',
	icon: 'CheckCircleOutline',
	surfaces: ['detail-page'],
	ownsTitle: true,
})

registerDashboardWidget('retention', {
	renderer: LazyCnRetentionWidget,
	form: null,
	defaultContent: { statusField: '', archivedValues: [], archivistGroups: ['archivaris'] },
	displayName: 'Retention',
	icon: 'ArchiveOutline',
	surfaces: ['detail-page'],
	ownsTitle: true,
	chrome: 'card',
})

registerDashboardWidget('schema-rules', {
	renderer: LazyCnSchemaRulesWidget,
	form: null,
	defaultContent: { register: '', schema: '', objectId: '' },
	displayName: 'Schema rules',
	icon: 'ScaleBalance',
	surfaces: ['detail-page'],
})

registerDashboardWidget('plan', {
	renderer: LazyCnPlanWidget,
	form: null,
	defaultContent: { emptyText: '' },
	displayName: 'Plan',
	icon: 'FormatListChecks',
	surfaces: ['detail-page'],
})

registerDashboardWidget('work-queue', {
	renderer: LazyCnWorkQueue,
	form: null,
	defaultContent: { source: null },
	displayName: 'Work queue',
	icon: 'TrayFull',
})

registerDashboardWidget('document-review', {
	renderer: LazyCnDocumentReviewWidget,
	form: null,
	defaultContent: { field: 'documents', statusField: 'reviewStatus', statuses: [] },
	displayName: 'Document review',
	icon: 'FileDocumentCheckOutline',
	surfaces: ['detail-page'],
	ownsTitle: true,
})

// The AI Chat Companion embedded in the page: the assistant as a tab or card
// rather than the launcher's floating window (DqZaakAssistent).
registerDashboardWidget('ai-chat', {
	renderer: LazyCnAiChatWidget,
	form: null,
	defaultContent: { chatAppId: '' },
	displayName: 'Assistant',
	icon: 'Creation',
	surfaces: ['detail-page'],
	ownsTitle: true,
})

// The macros the record's schema declares, each run by a button
// (DqZaakAssistent "Macro's").
registerDashboardWidget('macros', {
	renderer: LazyCnMacrosWidget,
	form: null,
	defaultContent: { description: '', emptyText: '' },
	displayName: 'Macros',
	icon: 'PlayBoxMultipleOutline',
	surfaces: ['detail-page'],
})

// The appointments booked on a record that is not an object (a flow task),
// read from a source or an endpoint.
registerDashboardWidget('events', {
	renderer: LazyCnEventsCard,
	form: null,
	defaultContent: { source: null, endpoint: '', emptyText: '' },
	displayName: 'Appointments',
	icon: 'CalendarClock',
	surfaces: ['detail-page'],
})

registerDashboardWidget('conversation', {
	renderer: LazyCnConversationWidget,
	form: null,
	defaultContent: { field: 'messages', endpoint: '' },
	displayName: 'Conversation',
	icon: 'ForumOutline',
	surfaces: ['detail-page'],
	ownsTitle: true,
})

// The record's stages, where clicking a stage moves the record there.
// Registered inline for the same tree-shaking reason as `map` above.
registerDashboardWidget('stages', {
	renderer: LazyCnStagesWidget,
	form: LazyCnStagesWidgetForm,
	defaultContent: {
		currentField: 'status',
		orientation: 'horizontal',
		size: 'medium',
		stagesEndpoint: { url: '', path: '' },
		// The LIFECYCLE, not a record write. OpenRegister decides what is
		// reachable and re-validates the move; a field write has neither.
		transition: { kind: 'lifecycle' },
	},
	displayName: 'Stages',
	icon: 'Timeline',
	// Card family on the detail grid: a titled wrapper around a self-contained
	// strip, like the KPI tiles it usually sits beside.
	card: true,
	// It reads and moves the BOUND RECORD, which only a detail page has.
	surfaces: ['detail-page'],
})

registerDashboardWidget('tabs', {
	renderer: LazyCnTabsWidget,
	form: LazyCnTabsWidgetForm,
	defaultContent: {
		tabs: [],
		ariaLabel: '',
	},
	displayName: 'Tabs',
	icon: 'TabPlus',
	// Renders OTHER widgets, so CnDetailWidgetHost hands it the surface's
	// sibling definitions and the context its children will need.
	container: true,
	// The strip's labels ARE the titles, so a card header above them would name
	// the group twice.
	ownsTitle: true,
	surfaces: ['detail-page'],
})

// The current week as day columns, with the dated items under each day.
// Registered inline for the same tree-shaking reason as `map` above.
registerDashboardWidget('week-strip', {
	renderer: LazyCnWeekStripWidget,
	form: LazyCnWeekStripWidgetForm,
	defaultContent: {
		source: { register: '', schema: '', filter: {} },
		dateField: '',
		titleField: '',
		metaFields: [],
		days: 5,
		itemRoute: '',
		emptyText: '',
	},
	displayName: 'Week strip',
	icon: 'Calendar',
})

// One segmented bar with a legend that carries the numbers.
registerDashboardWidget('stacked-bar', {
	renderer: LazyCnStackedBarWidget,
	form: LazyCnStackedBarWidgetForm,
	defaultContent: {
		source: { register: '', schema: '', groupBy: '', filter: {} },
		order: [],
		labels: {},
		emptyText: '',
	},
	displayName: 'Stacked bar',
	icon: 'ChartBar',
})

// The team today: availability from the Nextcloud user status and each
// person's open count from the app (DqTeamwachtrij "Team vandaag"). Placed
// from the manifest: there is no config form yet.
registerDashboardWidget('team-workload', {
	renderer: LazyCnTeamWorkloadWidget,
	form: null,
	defaultContent: { source: { url: '', responsePath: '', userField: 'userId', nameField: 'displayName', countField: 'count' } },
	displayName: 'Team workload',
	icon: 'AccountGroup',
})

/**
 * Explicit no-op that guarantees this module (and therefore every widget's
 * self-registration side effect) is evaluated. Now optional: `CnDashboardPage`
 * and `CnDetailPage` import this module themselves, and a second call changes
 * nothing because the module body runs once.
 *
 * @return {void}
 */
export function registerBuiltinDashboardWidgets() {}
