/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnActionTilesWidget: self-registers the `action-tiles` dashboard widget type
 * (a row of tiles that each run a declared action with the page's context) in
 * the shared dashboardWidgetRegistry at module load.
 */

import { lazyComponent } from '../../utils/lazyComponent.js'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

const LazyCnActionTilesWidget = lazyComponent(() => import('./CnActionTilesWidget.vue'), 'CnActionTilesWidget')

registerDashboardWidget('action-tiles', {
	placeholder: 'tiles',
	renderer: LazyCnActionTilesWidget,
	form: null,
	defaultContent: {
		tiles: [],
	},
	displayName: 'Action tiles',
	icon: 'GestureTapButton',
	surfaces: ['app-dashboard'],
})

export { default as CnActionTilesWidget } from './CnActionTilesWidget.vue'
export { default } from './CnActionTilesWidget.vue'
