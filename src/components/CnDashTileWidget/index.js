/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnDashTileWidget — self-registers the `tile` dashboard widget type into the
 * shared dashboardWidgetRegistry at module load. Named `CnDashTileWidget` to
 * avoid clobbering the library's existing quick-access `CnTileWidget`.
 */

import { lazyComponent } from '../../utils/lazyComponent.js'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

const LazyCnDashTileWidgetForm = lazyComponent(() => import('../CnDashTileWidgetForm/CnDashTileWidgetForm.vue'), 'CnDashTileWidgetForm')
const LazyCnDashTileWidget = lazyComponent(() => import('./CnDashTileWidget.vue'), 'CnDashTileWidget')

registerDashboardWidget('tile', {
	renderer: LazyCnDashTileWidget,
	form: LazyCnDashTileWidgetForm,
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

export { default as CnDashTileWidget } from './CnDashTileWidget.vue'
export { default } from './CnDashTileWidget.vue'
