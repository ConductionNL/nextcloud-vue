/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnIndexListWidget — self-registers the `index-list` widget type: a list
 * page's list, with its toolbar, inside a detail page.
 */

import CnIndexListWidget from './CnIndexListWidget.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('index-list', {
	renderer: CnIndexListWidget,
	form: null,
	defaultContent: {
		register: '',
		schema: '',
		filter: {},
	},
	displayName: 'List',
	icon: 'FormatListBulleted',
	surfaces: ['detail-page'],
	chrome: 'card',
})

export { CnIndexListWidget }
export default CnIndexListWidget
