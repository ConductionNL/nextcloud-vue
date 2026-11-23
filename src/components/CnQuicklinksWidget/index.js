/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnQuicklinksWidget — self-registers the `quicklinks` dashboard widget type
 * into the shared dashboardWidgetRegistry at module load.
 */

import { lazyComponent } from '../../utils/lazyComponent.js'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

const LazyCnQuicklinksWidgetForm = lazyComponent(() => import('../CnQuicklinksWidgetForm/CnQuicklinksWidgetForm.vue'), 'CnQuicklinksWidgetForm')
const LazyCnQuicklinksWidget = lazyComponent(() => import('./CnQuicklinksWidget.vue'), 'CnQuicklinksWidget')

registerDashboardWidget('quicklinks', {
	renderer: LazyCnQuicklinksWidget,
	form: LazyCnQuicklinksWidgetForm,
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

export { default as CnQuicklinksWidget } from './CnQuicklinksWidget.vue'
export { default } from './CnQuicklinksWidget.vue'
