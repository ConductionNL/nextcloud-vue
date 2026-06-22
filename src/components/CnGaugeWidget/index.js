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

registerDashboardWidget('gauge', {
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
})

export { CnGaugeWidget }
export default CnGaugeWidget
