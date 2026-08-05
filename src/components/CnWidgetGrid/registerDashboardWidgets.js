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
 * The individual widget components are intentionally NOT public exports — they
 * are resolved by their registry type key (the whole point of the registry),
 * so consumers reference them via the manifest `widgetKey`, not by import.
 *
 * @module components/CnWidgetGrid/registerDashboardWidgets
 */

import '../CnLabelWidget/index.js'
import '../CnTextWidget/index.js'
import '../CnImageWidget/index.js'
import '../CnLinkButtonWidget/index.js'
import '../CnDividerWidget/index.js'
import '../CnHeaderWidget/index.js'
import '../CnQuicklinksWidget/index.js'
import '../CnVideoWidget/index.js'
import '../CnNewsWidget/index.js'
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
import '../CnObjectDataWidget/dashboardRegistration.js'
import '../CnObjectGeoWidget/dashboardRegistration.js'
import '../CnWidgetObjectTable/dashboardRegistration.js'
import '../CnAuditTrailWidget/dashboardRegistration.js'
import '../CnObjectListWidget/index.js'
import '../CnMapWidget/index.js'
import '../CnKbSearchWidget/index.js'
import '../CnInteractionFormWidget/index.js'
import '../CnBannerWidget/index.js'
import '../CnWorkspaceFilterWidget/index.js'

// Typed widgets registered with an explicit renderer + config FORM. chart /
// stats-block render through CnDashboardPage's own isChart()/isStatsBlock()
// branches and `related` through CnDetailPage's isRelatedWidget() branch — the
// registry entry exists so the cog editor + Add-widget picker get a form (and,
// for `related`, the detail-page surface). `table` aliases the object-list
// renderer/form for legacy manifests using type:'table'.
import { registerDashboardWidget } from './dashboardWidgetRegistry.js'
import CnChartWidget from '../CnChartWidget/CnChartWidget.vue'
import CnChartWidgetForm from '../CnChartWidgetForm/CnChartWidgetForm.vue'
import CnStatsBlockWidget from '../CnStatsBlockWidget/CnStatsBlockWidget.vue'
import CnStatsBlockWidgetForm from '../CnStatsBlockWidgetForm/CnStatsBlockWidgetForm.vue'
import CnObjectListWidget2 from '../CnObjectListWidget/CnObjectListWidget.vue'
import CnObjectListWidgetForm2 from '../CnObjectListWidgetForm/CnObjectListWidgetForm.vue'
import CnMapWidget from '../CnMapWidget/CnMapWidget.vue'
import CnMapWidgetForm from '../CnMapWidgetForm/CnMapWidgetForm.vue'
import CnRelatedObjectsWidget from '../CnRelatedObjectsWidget/CnRelatedObjectsWidget.vue'
import CnRelatedObjectsWidgetForm from '../CnRelatedObjectsWidgetForm/CnRelatedObjectsWidgetForm.vue'

registerDashboardWidget('chart', {
	renderer: CnChartWidget,
	form: CnChartWidgetForm,
	defaultContent: {
		chartKind: 'area',
		dataSource: { register: '', schema: '', filter: {}, bucket: { field: '', interval: 'month', metric: 'count', metricField: '' } },
	},
	displayName: 'Chart',
	icon: 'ChartLine',
})

registerDashboardWidget('stats-block', {
	renderer: CnStatsBlockWidget,
	form: CnStatsBlockWidgetForm,
	defaultContent: {
		title: '',
		props: { countLabel: '', variant: 'default', iconClass: '' },
		dataSource: { register: '', schema: '', metric: 'count', field: '', filter: {} },
	},
	displayName: 'Statistic card',
	icon: 'ChartBar',
})

// `table` and `object-list` (below) are legacy aliases of `object-table` — same
// config form (CnObjectListWidgetForm), same job. They stay registered so
// existing placements keep rendering, but are hidden from every Add-widget
// picker via a sentinel surface no picker queries (see widgetTypeAllowsSurface):
// `object-table` is the one to add now. Rendering resolves through
// getWidgetTypeEntry, which ignores `surfaces`, so hidden ≠ broken.
registerDashboardWidget('table', {
	renderer: CnObjectListWidget2,
	form: CnObjectListWidgetForm2,
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

// `object-list` MUST be registered inline here, not only via the bare
// `import '../CnObjectListWidget/index.js'` side effect above: package.json
// declares `sideEffects: ["**/*.css"]` (ADR-061 tree-shaking), which lets
// rollup/webpack legally DROP bare imports of side-effect-free JS modules —
// the dist bundle shipped without the object-list registration and every
// manifest `type:"object-list"` widget rendered blank. Inline calls in this
// module survive because consumers import live bindings from the registry.
registerDashboardWidget('object-list', {
	renderer: CnObjectListWidget2,
	form: CnObjectListWidgetForm2,
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

registerDashboardWidget('related', {
	renderer: CnRelatedObjectsWidget,
	form: CnRelatedObjectsWidgetForm,
	defaultContent: { title: '', groups: [], hideSingleTabTitle: true, showTotalCount: true },
	displayName: 'Object relations',
	icon: 'FileTreeOutline',
	surfaces: ['detail-page'],
	ownsTitle: true,
})

// `map` is registered inline for the same tree-shaking reason as `object-list`
// above — a bare `import '../CnMapWidget/index.js'` is a side-effect-free JS module
// as far as the bundler is concerned, so it may legally be dropped and the widget
// would silently never appear in Add Widget.
registerDashboardWidget('map', {
	renderer: CnMapWidget,
	form: CnMapWidgetForm,
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

/**
 * Explicit no-op that guarantees this module (and therefore every widget's
 * self-registration side effect) is evaluated. Call it once at app bootstrap if
 * a bundler tree-shakes bare side-effect imports.
 *
 * @return {void}
 */
export function registerBuiltinDashboardWidgets() {}
