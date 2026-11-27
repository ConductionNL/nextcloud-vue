/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnKbSearchWidget — self-registers the `kb-search` dashboard widget type (a
 * summary-driven knowledge-base search bound to the page workspace context)
 * into the shared dashboardWidgetRegistry at module load. Resolved by its type
 * key via CnDashboardPage's registryRenderer.
 */

import { lazyComponent } from '../../utils/lazyComponent.js'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

const LazyCnKbSearchWidget = lazyComponent(() => import('./CnKbSearchWidget.vue'), 'CnKbSearchWidget')

registerDashboardWidget('kb-search', {
	placeholder: 'block',
	renderer: LazyCnKbSearchWidget,
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

export { default as CnKbSearchWidget } from './CnKbSearchWidget.vue'
export { default } from './CnKbSearchWidget.vue'
