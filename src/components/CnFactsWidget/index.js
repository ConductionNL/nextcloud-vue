/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnFactsWidget — self-registers the `facts` widget type (a card of facts
 * about one object: label/value rows, a title line, meta lines, a pill and a
 * link) into the shared dashboardWidgetRegistry at module load. Renderer
 * only: the facts are declared in the manifest, so the Add-widget picker does
 * not offer it.
 */

import { lazyComponent } from '../../utils/lazyComponent.js'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

const LazyCnFactsWidget = lazyComponent(() => import('./CnFactsWidget.vue'), 'CnFactsWidget')

registerDashboardWidget('facts', {
	renderer: LazyCnFactsWidget,
	form: null,
	defaultContent: {
		fields: [],
		hideEmpty: true,
		emptyText: '',
	},
	displayName: 'Facts',
	icon: 'TextBoxOutline',
	surfaces: ['detail-page', 'app-dashboard'],
})

export { default as CnFactsWidget } from './CnFactsWidget.vue'
export { default } from './CnFactsWidget.vue'
