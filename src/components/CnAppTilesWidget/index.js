/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnAppTilesWidget — self-registers the `app-tiles` widget type (the apps a
 * person can open, as tiles with a filter and a "Most used" row) into the
 * shared dashboardWidgetRegistry at module load.
 */

import CnAppTilesWidgetForm from '../CnAppTilesWidgetForm/CnAppTilesWidgetForm.vue'
import CnAppTilesWidget from './CnAppTilesWidget.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('app-tiles', {
	renderer: CnAppTilesWidget,
	form: CnAppTilesWidgetForm,
	defaultContent: {
		title: 'Apps',
		pinned: [],
		exclude: [],
		showFilter: true,
		showMostUsed: true,
		mostUsedLimit: 4,
	},
	displayName: 'App tiles',
	icon: 'ViewGridOutline',
	surfaces: ['app-dashboard'],
})

export { CnAppTilesWidget }
export default CnAppTilesWidget
