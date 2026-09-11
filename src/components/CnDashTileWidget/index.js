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
		// Empty, not a hex: an author who never opened the colour picker had a
		// Tailwind blue stored for them, so every tile came out deliberately
		// coloured. Empty lets the renderer fall back to the instance theme.
		backgroundColor: '',
		textColor: '',
		linkType: 'app',
		linkValue: '',
	},
	displayName: 'Tile',
	icon: 'ViewGrid',
})

export { CnDashTileWidget }
export default CnDashTileWidget
