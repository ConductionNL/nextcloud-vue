/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnGaugeWidget — self-registers the `gauge` dashboard widget type (an abstract
 * progress-to-target utilization bar) into the shared dashboardWidgetRegistry at
 * module load. Resolved by its type key; not a public export. The matching
 * `CnGaugeWidgetForm` drives both the `CnAddWidgetModal` create flow and the cog
 * `CnWidgetStyleEditorModal`.
 */

import CnGaugeWidget from './CnGaugeWidget.vue'
import CnGaugeWidgetForm from '../CnGaugeWidgetForm/CnGaugeWidgetForm.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

/**
 * The `gauge` registry entry. Exported so the barrel
 * (registerDashboardWidgets.js) can register it INLINE — a bare
 * `import './index.js'` side effect is tree-shaken out of the single-file
 * dist because package.json's `sideEffects` globs never match a dist path.
 * See the object-list note in registerDashboardWidgets.js.
 */
export const gaugeWidgetRegistration = {
	renderer: CnGaugeWidget,
	form: CnGaugeWidgetForm,
	defaultContent: {
		label: '',
		format: { style: 'number', currency: 'EUR', decimals: 0 },
		source: { register: '', schema: '', metric: 'count', field: '', filter: {} },
		target: { kind: 'static', value: 100, metric: 'count', field: '', filter: {} },
		thresholds: { warn: 80, danger: 100, invert: false },
	},
	displayName: 'Gauge / utilization',
	icon: 'Gauge',
	// Self-contained card surface — rendered flush and centred (no inner
	// scrollbar). See CnDashboardPage.isCardWidget.
	card: true,
}

registerDashboardWidget('gauge', gaugeWidgetRegistration)

export { CnGaugeWidget }
export default CnGaugeWidget
