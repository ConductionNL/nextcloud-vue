/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnGroupedCardsWidget — self-registers the `grouped-cards` widget type
 * (groups of cards side by side, read from an app endpoint) into the shared
 * dashboardWidgetRegistry at module load.
 */

import { lazyComponent } from '../../utils/lazyComponent.js'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

const LazyCnGroupedCardsWidget = lazyComponent(() => import('./CnGroupedCardsWidget.vue'), 'CnGroupedCardsWidget')

registerDashboardWidget('grouped-cards', {
	placeholder: 'tiles',
	renderer: LazyCnGroupedCardsWidget,
	form: null,
	defaultContent: {
		endpointSource: { url: '' },
		groupsPath: 'groups',
		itemsKey: 'items',
		columns: 2,
	},
	displayName: 'Grouped cards',
	icon: 'ViewGridOutline',
	surfaces: ['detail-page', 'app-dashboard'],
})

export { default as CnGroupedCardsWidget } from './CnGroupedCardsWidget.vue'
export { default } from './CnGroupedCardsWidget.vue'
