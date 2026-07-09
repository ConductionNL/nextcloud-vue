/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnLinksWidget — self-registers the `links` dashboard widget type into the
 * shared dashboardWidgetRegistry at module load.
 */

import CnLinksWidget from './CnLinksWidget.vue'
import CnLinksWidgetForm from '../CnLinksWidgetForm/CnLinksWidgetForm.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('links', {
	renderer: CnLinksWidget,
	form: CnLinksWidgetForm,
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

export { CnLinksWidget }
export default CnLinksWidget
