/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnIndexListWidget — self-registers the `index-list` widget type: a list
 * page's list, with its toolbar, inside a detail page.
 */

import { lazyComponent } from '../../utils/lazyComponent.js'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

const LazyCnIndexListWidget = lazyComponent(() => import('./CnIndexListWidget.vue'), 'CnIndexListWidget')

registerDashboardWidget('index-list', {
	renderer: LazyCnIndexListWidget,
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

export { default as CnIndexListWidget } from './CnIndexListWidget.vue'
export { default } from './CnIndexListWidget.vue'
