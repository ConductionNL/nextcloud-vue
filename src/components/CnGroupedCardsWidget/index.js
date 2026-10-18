/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnGroupedCardsWidget — self-registers the `grouped-cards` widget type
 * (groups of cards side by side, read from an app endpoint) into the shared
 * dashboardWidgetRegistry at module load.
 */

import CnGroupedCardsWidget from './CnGroupedCardsWidget.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('grouped-cards', {
	renderer: CnGroupedCardsWidget,
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

export { CnGroupedCardsWidget }
export default CnGroupedCardsWidget
