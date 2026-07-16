/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnDashTileWidget — self-registers the `tile` dashboard widget type into the
 * shared dashboardWidgetRegistry at module load. Named `CnDashTileWidget` to
 * avoid clobbering the library's existing quick-access `CnTileWidget`.
 */

import CnDashTileWidget from './CnDashTileWidget.vue'
import CnDashTileWidgetForm from '../CnDashTileWidgetForm/CnDashTileWidgetForm.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('tile', {
	renderer: CnDashTileWidget,
	form: CnDashTileWidgetForm,
	defaultContent: {
		title: '',
		icon: '',
		iconType: 'class',
		backgroundColor: '#3b82f6',
		textColor: '#ffffff',
		linkType: 'app',
		linkValue: '',
	},
	displayName: 'Tile',
	icon: 'ViewGrid',
})

export { CnDashTileWidget }
export default CnDashTileWidget
