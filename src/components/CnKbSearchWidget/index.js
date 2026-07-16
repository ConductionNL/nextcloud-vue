/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnKbSearchWidget — self-registers the `kb-search` dashboard widget type (a
 * summary-driven knowledge-base search bound to the page workspace context)
 * into the shared dashboardWidgetRegistry at module load. Resolved by its type
 * key via CnDashboardPage's registryRenderer.
 */

import CnKbSearchWidget from './CnKbSearchWidget.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('kb-search', {
	renderer: CnKbSearchWidget,
	defaultContent: {
		endpoint: '/apps/openregister/api/integrations/xwiki/search',
		queryParam: 'q',
		bindTo: 'activeSummary',
		minChars: 3,
		limit: 8,
	},
	displayName: 'Knowledge base search',
	icon: 'BookOpenVariant',
})

export { CnKbSearchWidget }
export default CnKbSearchWidget
