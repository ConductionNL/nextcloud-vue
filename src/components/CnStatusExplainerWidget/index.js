/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnStatusExplainerWidget — self-registers the `status-explainer` widget type
 * (what the status a record is in asks of it, read from a transition
 * endpoint and the record's field rules) into the shared
 * dashboardWidgetRegistry at module load.
 */

import CnStatusExplainerWidget from './CnStatusExplainerWidget.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('status-explainer', {
	renderer: CnStatusExplainerWidget,
	form: null,
	defaultContent: {
		endpointSource: { url: '' },
		fieldRules: true,
	},
	displayName: 'Status explainer',
	icon: 'InformationOutline',
	surfaces: ['detail-page'],
})

export { CnStatusExplainerWidget }
export default CnStatusExplainerWidget
