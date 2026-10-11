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

import CnFactsWidget from './CnFactsWidget.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('facts', {
	renderer: CnFactsWidget,
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

export { CnFactsWidget }
export default CnFactsWidget
