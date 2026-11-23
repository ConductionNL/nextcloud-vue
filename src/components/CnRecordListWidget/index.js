/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnRecordListWidget — self-registers the `record-list` widget type (the
 * objects of another schema that point at this record, as board rows, a feed
 * or inline links) into the shared dashboardWidgetRegistry at module load.
 * Renderer only: the list is declared in the manifest.
 */

import { lazyComponent } from '../../utils/lazyComponent.js'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

const LazyCnRecordListWidget = lazyComponent(() => import('./CnRecordListWidget.vue'), 'CnRecordListWidget')

registerDashboardWidget('record-list', {
	renderer: LazyCnRecordListWidget,
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

export { default as CnRecordListWidget } from './CnRecordListWidget.vue'
export { default } from './CnRecordListWidget.vue'
