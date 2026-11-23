/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnLinksWidget — self-registers the `links` dashboard widget type into the
 * shared dashboardWidgetRegistry at module load.
 */

import { lazyComponent } from '../../utils/lazyComponent.js'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

const LazyCnLinksWidgetForm = lazyComponent(() => import('../CnLinksWidgetForm/CnLinksWidgetForm.vue'), 'CnLinksWidgetForm')
const LazyCnLinksWidget = lazyComponent(() => import('./CnLinksWidget.vue'), 'CnLinksWidget')

registerDashboardWidget('links', {
	renderer: LazyCnLinksWidget,
	form: LazyCnLinksWidgetForm,
	defaultContent: {
		sections: [],
		columns: 3,
		linkLayout: 'card',
		iconSize: 'medium',
		openInNewTab: true,
		showSectionTitles: true,
		showLinkDescriptions: true,
	},
	displayName: 'Links',
	icon: 'LinkBoxVariant',
})

export { default as CnLinksWidget } from './CnLinksWidget.vue'
export { default } from './CnLinksWidget.vue'
