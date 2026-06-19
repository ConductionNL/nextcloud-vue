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
import '../CnObjectListWidget/index.js'

// The `chart` type renders through CnDashboardPage's dedicated isChart() branch
// (CnChartWidget), NOT the registry renderer — but registering it here gives the
// cog CnWidgetStyleEditorModal + CnAddWidgetModal a config FORM for chart widgets.
import CnChartWidget from '../CnChartWidget/CnChartWidget.vue'
import CnChartWidgetForm from '../CnChartWidgetForm/CnChartWidgetForm.vue'
import { registerDashboardWidget } from './dashboardWidgetRegistry.js'

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

/**
 * Explicit no-op that guarantees this module (and therefore every widget's
 * self-registration side effect) is evaluated. Call it once at app bootstrap if
 * a bundler tree-shakes bare side-effect imports.
 *
 * @return {void}
 */
export function registerBuiltinDashboardWidgets() {}
