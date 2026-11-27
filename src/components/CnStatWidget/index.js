/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnStatWidget — self-registers the `stat` dashboard widget type (an abstract,
 * OpenRegister-aggregation-backed KPI tile) into the shared
 * dashboardWidgetRegistry at module load. Resolved by its type key; not a
 * public export. The matching `CnStatWidgetForm` drives both the
 * `CnAddWidgetModal` create flow and the cog `CnWidgetStyleEditorModal`.
 */

import { lazyComponent } from '../../utils/lazyComponent.js'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

const LazyCnStatWidgetForm = lazyComponent(() => import('../CnStatWidgetForm/CnStatWidgetForm.vue'), 'CnStatWidgetForm')
const LazyCnStatWidget = lazyComponent(() => import('./CnStatWidget.vue'), 'CnStatWidget')

registerDashboardWidget('stat', {
	renderer: LazyCnStatWidget,
	form: LazyCnStatWidgetForm,
	defaultContent: {
		label: '',
		icon: 'Cash',
		iconColor: '',
		valueColor: '#0082c9',
		caption: '',
		format: { style: 'number', currency: 'EUR', decimals: 0 },
		source: { register: '', schema: '', metric: 'count', field: '', filter: {} },
	},
	// What a widget picker's miniature draws with `preview` set.
	sampleContent: { label: 'Open cases', icon: 'TrendingUp', valueColor: '#0082c9', format: { style: 'number', decimals: 0 }, sampleValue: 42 },
	displayName: 'Statistic / KPI',
	icon: 'TrendingUp',
	// Self-contained card surface — CnDashboardPage renders it flush and
	// centred (no inner scrollbar). See CnDashboardPage.isCardWidget.
	card: true,
})

export { default as CnStatWidget } from './CnStatWidget.vue'
export { default } from './CnStatWidget.vue'
