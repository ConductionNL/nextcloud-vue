/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnSlotGrid — self-registers the `slot-grid` widget type (the objects of one
 * schema laid out by a row value and a column value, added per cell) into the
 * shared dashboardWidgetRegistry.
 */

import CnSlotGrid from './CnSlotGrid.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('slot-grid', {
	renderer: CnSlotGrid,
	form: null,
	defaultContent: {
		source: { register: '', schema: '' },
		rowFields: [],
		columnField: '',
		columns: [],
	},
	displayName: 'Slot grid',
	icon: 'TableLarge',
	surfaces: ['dashboard', 'detail-page'],
})

export { CnSlotGrid }
export default CnSlotGrid
