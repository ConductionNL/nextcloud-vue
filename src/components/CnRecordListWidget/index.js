/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnRecordListWidget — self-registers the `record-list` widget type (the
 * objects of another schema that point at this record, as board rows, a feed
 * or inline links) into the shared dashboardWidgetRegistry at module load.
 * Renderer only: the list is declared in the manifest.
 */

import CnRecordListWidget from './CnRecordListWidget.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('record-list', {
	renderer: CnRecordListWidget,
	form: null,
	defaultContent: {
		register: '',
		schema: '',
		filter: {},
		presentation: 'rows',
		limit: 5,
	},
	displayName: 'Record list',
	icon: 'FormatListBulleted',
	surfaces: ['detail-page', 'app-dashboard'],
})

export { CnRecordListWidget }
export default CnRecordListWidget
