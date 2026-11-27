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

import { lazyComponent } from '../../utils/lazyComponent.js'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

const LazyCnGaugeWidgetForm = lazyComponent(() => import('../CnGaugeWidgetForm/CnGaugeWidgetForm.vue'), 'CnGaugeWidgetForm')
const LazyCnGaugeWidget = lazyComponent(() => import('./CnGaugeWidget.vue'), 'CnGaugeWidget')

registerDashboardWidget('gauge', {
	placeholder: 'block',
	renderer: LazyCnGaugeWidget,
	form: LazyCnGaugeWidgetForm,
	defaultContent: {
		label: '',
		format: { style: 'number', currency: 'EUR', decimals: 0 },
		source: { register: '', schema: '', metric: 'count', field: '', filter: {} },
		target: { kind: 'static', value: 100, metric: 'count', field: '', filter: {} },
		thresholds: { warn: 80, danger: 100, invert: false },
	},
	// What a widget picker's miniature draws with `preview` set.
	sampleContent: { label: 'Handled on time', format: { style: 'number', decimals: 0 }, thresholds: { warn: 80, danger: 100, invert: false }, sampleValue: 82, sampleTarget: 100 },
	displayName: 'Gauge / utilization',
	icon: 'Gauge',
	// Self-contained card surface — rendered flush and centred (no inner
	// scrollbar). See CnDashboardPage.isCardWidget.
	card: true,
})

export { default as CnGaugeWidget } from './CnGaugeWidget.vue'
export { default } from './CnGaugeWidget.vue'
