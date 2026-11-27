/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnContainerWidget — self-registers the `container` dashboard widget type into
 * the shared dashboardWidgetRegistry at module load.
 */

import { lazyComponent } from '../../utils/lazyComponent.js'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

const LazyCnContainerWidgetForm = lazyComponent(() => import('../CnContainerWidgetForm/CnContainerWidgetForm.vue'), 'CnContainerWidgetForm')
const LazyCnContainerWidget = lazyComponent(() => import('./CnContainerWidget.vue'), 'CnContainerWidget')

registerDashboardWidget('container', {
	placeholder: 'block',
	renderer: LazyCnContainerWidget,
	form: LazyCnContainerWidgetForm,
	defaultContent: {
		placements: [],
		backgroundColor: 'transparent',
		padding: 'medium',
		title: '',
	},
	displayName: 'Container',
	icon: 'ViewDashboard',
})

export { default as CnContainerWidget } from './CnContainerWidget.vue'
export { default } from './CnContainerWidget.vue'
