/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnDeltaWidget — self-registers the `delta` dashboard widget type (an abstract
 * period-over-period comparison KPI) into the shared dashboardWidgetRegistry at
 * module load. Resolved by its type key; not a public export. The matching
 * `CnDeltaWidgetForm` drives both the `CnAddWidgetModal` create flow and the cog
 * `CnWidgetStyleEditorModal`.
 */

import { lazyComponent } from '../../utils/lazyComponent.js'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

const LazyCnDeltaWidgetForm = lazyComponent(() => import('../CnDeltaWidgetForm/CnDeltaWidgetForm.vue'), 'CnDeltaWidgetForm')
const LazyCnDeltaWidget = lazyComponent(() => import('./CnDeltaWidget.vue'), 'CnDeltaWidget')

registerDashboardWidget('delta', {
	renderer: LazyCnDeltaWidget,
	form: LazyCnDeltaWidgetForm,
	defaultContent: {
		label: '',
		icon: 'Cash',
		format: { style: 'number', currency: 'EUR', decimals: 0 },
		source: { register: '', schema: '', metric: 'count', field: '', goodDirection: 'up', current: { filter: {} }, previous: { filter: {} } },
	},
	// What a widget picker's miniature draws with `preview` set.
	sampleContent: { label: 'Requests this week', icon: 'TrendingUp', format: { style: 'number', decimals: 0 }, source: { goodDirection: 'up' }, sampleValue: 18, samplePrevious: 14 },
	displayName: 'Comparison / delta',
	icon: 'TrendingUp',
	// Self-contained card surface — rendered flush and centred (no inner
	// scrollbar). See CnDashboardPage.isCardWidget.
	card: true,
})

export { default as CnDeltaWidget } from './CnDeltaWidget.vue'
export { default } from './CnDeltaWidget.vue'
