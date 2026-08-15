/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnNewsWidget — self-registers the `news` dashboard widget type into the
 * shared dashboardWidgetRegistry at module load.
 */

import CnNewsWidget from './CnNewsWidget.vue'
import CnNewsWidgetForm from '../CnNewsWidgetForm/CnNewsWidgetForm.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('news', {
	renderer: CnNewsWidget,
	form: CnNewsWidgetForm,
	defaultContent: {
		feedUrls: [],
		layout: 'list',
		itemLimit: 10,
		showThumbnails: true,
		showSummary: true,
		summaryMaxChars: 200,
		dateFormat: 'relative',
		metadataFilter: null,
	},
	displayName: 'News',
	icon: 'RssBox',
})

export { CnNewsWidget }
export default CnNewsWidget
