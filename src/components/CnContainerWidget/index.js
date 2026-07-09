/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnContainerWidget — self-registers the `container` dashboard widget type into
 * the shared dashboardWidgetRegistry at module load.
 */

import CnContainerWidget from './CnContainerWidget.vue'
import CnContainerWidgetForm from '../CnContainerWidgetForm/CnContainerWidgetForm.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('container', {
	renderer: CnContainerWidget,
	form: CnContainerWidgetForm,
	defaultContent: {
		placements: [],
		backgroundColor: 'transparent',
		padding: 'medium',
		title: '',
	},
	displayName: 'Container',
	icon: 'ViewDashboard',
})

export { CnContainerWidget }
export default CnContainerWidget
