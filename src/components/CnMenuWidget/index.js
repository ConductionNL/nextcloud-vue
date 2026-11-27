/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnMenuWidget — self-registers the `menu` dashboard widget type into the
 * shared dashboardWidgetRegistry at module load.
 */

import { lazyComponent } from '../../utils/lazyComponent.js'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

const LazyCnMenuWidgetForm = lazyComponent(() => import('../CnMenuWidgetForm/CnMenuWidgetForm.vue'), 'CnMenuWidgetForm')
const LazyCnMenuWidget = lazyComponent(() => import('./CnMenuWidget.vue'), 'CnMenuWidget')

registerDashboardWidget('menu', {
	placeholder: 'rows',
	renderer: LazyCnMenuWidget,
	form: LazyCnMenuWidgetForm,
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

export { default as CnMenuWidget } from './CnMenuWidget.vue'
export { default } from './CnMenuWidget.vue'
