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

import CnDeltaWidget from './CnDeltaWidget.vue'
import CnDeltaWidgetForm from '../CnDeltaWidgetForm/CnDeltaWidgetForm.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('delta', {
	renderer: CnDeltaWidget,
	form: CnDeltaWidgetForm,
	defaultContent: {
		label: '',
		icon: 'Cash',
		format: { style: 'number', currency: 'EUR', decimals: 0 },
		source: { register: '', schema: '', metric: 'count', field: '', goodDirection: 'up', current: { filter: {} }, previous: { filter: {} } },
	},
	displayName: 'Comparison / delta',
	icon: 'TrendingUp',
	// Self-contained card surface — rendered flush and centred (no inner
	// scrollbar). See CnDashboardPage.isCardWidget.
	card: true,
})

export { CnDeltaWidget }
export default CnDeltaWidget
