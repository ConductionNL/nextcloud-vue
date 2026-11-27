/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnAppTilesWidget — self-registers the `app-tiles` widget type (the apps a
 * person can open, as tiles with a filter and a "Most used" row) into the
 * shared dashboardWidgetRegistry at module load.
 */

import { lazyComponent } from '../../utils/lazyComponent.js'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

const LazyCnAppTilesWidgetForm = lazyComponent(() => import('../CnAppTilesWidgetForm/CnAppTilesWidgetForm.vue'), 'CnAppTilesWidgetForm')
const LazyCnAppTilesWidget = lazyComponent(() => import('./CnAppTilesWidget.vue'), 'CnAppTilesWidget')

registerDashboardWidget('app-tiles', {
	placeholder: 'tiles',
	renderer: LazyCnAppTilesWidget,
	form: LazyCnAppTilesWidgetForm,
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

export { default as CnAppTilesWidget } from './CnAppTilesWidget.vue'
export { default } from './CnAppTilesWidget.vue'
