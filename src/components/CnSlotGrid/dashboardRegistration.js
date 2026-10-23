/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Registers the `slot-grid` widget type (CnSlotGrid) in the shared
 * dashboardWidgetRegistry. The file name keeps it in the package's
 * `sideEffects` allowlist, so a bundler does not drop the registration.
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
