/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnRowMarkList — self-registers the `row-mark-list` widget type (every row of
 * a list gets one of a few marks, saved in one request) into the shared
 * dashboardWidgetRegistry.
 */

import CnRowMarkList from './CnRowMarkList.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('row-mark-list', {
	renderer: CnRowMarkList,
	form: null,
	defaultContent: {
		load: { url: '' },
		save: { url: '' },
		states: [],
		detailFields: [],
	},
	displayName: 'Row mark list',
	icon: 'FormatListChecks',
	surfaces: ['dashboard', 'detail-page'],
})

export { CnRowMarkList }
export default CnRowMarkList
