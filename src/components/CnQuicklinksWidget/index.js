/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnQuicklinksWidget — self-registers the `quicklinks` dashboard widget type
 * into the shared dashboardWidgetRegistry at module load.
 */

import CnQuicklinksWidget from './CnQuicklinksWidget.vue'
import CnQuicklinksWidgetForm from '../CnQuicklinksWidgetForm/CnQuicklinksWidgetForm.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('quicklinks', {
	renderer: CnQuicklinksWidget,
	form: CnQuicklinksWidgetForm,
	defaultContent: {
		links: [],
		iconSize: 'medium',
		iconShape: 'rounded',
		showLabels: true,
		labelPosition: 'below',
		columns: 'auto',
		tileBackgroundStyle: 'transparent',
		hoverEffect: 'lift',
	},
	displayName: 'Quicklinks',
	icon: 'Star',
})

export { CnQuicklinksWidget }
export default CnQuicklinksWidget
