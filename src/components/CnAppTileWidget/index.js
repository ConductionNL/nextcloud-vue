/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnAppTileWidget: self-registers the `app-tile` widget type (one app as one
 * square, coloured tile) into the shared dashboardWidgetRegistry at module load.
 */

import { lazyComponent } from '../../utils/lazyComponent.js'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

const LazyCnAppTileWidgetForm = lazyComponent(() => import('../CnAppTileWidgetForm/CnAppTileWidgetForm.vue'), 'CnAppTileWidgetForm')
const LazyCnAppTileWidget = lazyComponent(() => import('./CnAppTileWidget.vue'), 'CnAppTileWidget')

registerDashboardWidget('app-tile', {
	renderer: LazyCnAppTileWidget,
	form: LazyCnAppTileWidgetForm,
	defaultContent: {
		appId: '',
		colour: '',
		showCount: true,
		pinned: false,
	},
	displayName: 'App tile',
	icon: 'ApplicationOutline',
	surfaces: ['app-dashboard'],
	// One cell: the boards draw each app tile as a widget of its own.
	minWidth: 1,
})

export { default as CnAppTileWidget } from './CnAppTileWidget.vue'
export { default } from './CnAppTileWidget.vue'
