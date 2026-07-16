/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnMenuWidget — self-registers the `menu` dashboard widget type into the
 * shared dashboardWidgetRegistry at module load.
 */

import CnMenuWidget from './CnMenuWidget.vue'
import CnMenuWidgetForm from '../CnMenuWidgetForm/CnMenuWidgetForm.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('menu', {
	renderer: CnMenuWidget,
	form: CnMenuWidgetForm,
	defaultContent: {
		items: [],
		style: 'dropdown',
		orientation: 'horizontal',
		showIcons: true,
		expandedByDefault: false,
		activeItemHighlight: 'underline',
	},
	displayName: 'Menu',
	icon: 'ViewDashboard',
})

export { CnMenuWidget }
export default CnMenuWidget
