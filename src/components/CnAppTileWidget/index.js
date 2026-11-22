/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnAppTileWidget: self-registers the `app-tile` widget type (one app as one
 * square, coloured tile) into the shared dashboardWidgetRegistry at module load.
 */

import CnAppTileWidgetForm from '../CnAppTileWidgetForm/CnAppTileWidgetForm.vue'
import CnAppTileWidget from './CnAppTileWidget.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('app-tile', {
	renderer: CnAppTileWidget,
	form: CnAppTileWidgetForm,
	defaultContent: {
		appId: '',
		colour: '',
		showCount: true,
		pinned: false,
	},
	displayName: 'App tile',
	icon: 'ApplicationOutline',
	surfaces: ['app-dashboard'],
})

export { CnAppTileWidget }
export default CnAppTileWidget
