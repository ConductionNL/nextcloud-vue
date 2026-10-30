/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnActionTilesWidget: self-registers the `action-tiles` dashboard widget type
 * (a row of tiles that each run a declared action with the page's context) in
 * the shared dashboardWidgetRegistry at module load.
 */

import CnActionTilesWidget from './CnActionTilesWidget.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('action-tiles', {
	renderer: CnActionTilesWidget,
	form: null,
	defaultContent: {
		tiles: [],
	},
	displayName: 'Action tiles',
	icon: 'GestureTapButton',
	surfaces: ['app-dashboard'],
})

export { CnActionTilesWidget }
export default CnActionTilesWidget
