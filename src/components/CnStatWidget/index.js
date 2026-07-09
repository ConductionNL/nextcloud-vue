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

import CnStatWidget from './CnStatWidget.vue'
import CnStatWidgetForm from '../CnStatWidgetForm/CnStatWidgetForm.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

/**
 * The `stat` registry entry. Exported so the barrel
 * (registerDashboardWidgets.js) can register it INLINE — a bare
 * `import './index.js'` side effect is tree-shaken out of the single-file
 * dist because package.json's `sideEffects` globs never match a dist path.
 * See the object-list note in registerDashboardWidgets.js.
 */
export const statWidgetRegistration = {
	renderer: CnStatWidget,
	form: CnStatWidgetForm,
	defaultContent: {
		label: '',
		icon: 'Cash',
		iconColor: '',
		valueColor: '#0082c9',
		caption: '',
		format: { style: 'number', currency: 'EUR', decimals: 0 },
		source: { register: '', schema: '', metric: 'count', field: '', filter: {} },
	},
	displayName: 'Statistic / KPI',
	icon: 'TrendingUp',
	// Self-contained card surface — CnDashboardPage renders it flush and
	// centred (no inner scrollbar). See CnDashboardPage.isCardWidget.
	card: true,
}

registerDashboardWidget('stat', statWidgetRegistration)

export { CnStatWidget }
export default CnStatWidget
