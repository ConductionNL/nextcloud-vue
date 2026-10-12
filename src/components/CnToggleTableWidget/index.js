/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnToggleTableWidget — self-registers the `toggle-table` widget type (rows
 * from a configured list or a source, each with a switch bound to the current
 * object, and optional extra columns) into the shared dashboardWidgetRegistry.
 */

import CnToggleTableWidget from './CnToggleTableWidget.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('toggle-table', {
	renderer: CnToggleTableWidget,
	form: null,
	defaultContent: {
		bind: { mode: 'flag' },
		rows: [],
	},
	displayName: 'Toggle table',
	icon: 'TableCheck',
	surfaces: ['detail-page'],
})

export { CnToggleTableWidget }
export default CnToggleTableWidget
