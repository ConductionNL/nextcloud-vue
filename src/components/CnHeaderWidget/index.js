/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnHeaderWidget — self-registers the `header` dashboard widget type into the
 * shared dashboardWidgetRegistry at module load.
 */

import CnHeaderWidget from './CnHeaderWidget.vue'
import CnHeaderWidgetForm from '../CnHeaderWidgetForm/CnHeaderWidgetForm.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('header', {
	renderer: CnHeaderWidget,
	form: CnHeaderWidgetForm,
	defaultContent: {
		title: '',
		subtitle: '',
		backgroundImageUrl: '',
		backgroundImageFileId: null,
		backgroundColor: '',
		overlayMode: 'none',
		overlayColor: '',
		overlayOpacity: 0.4,
		textColor: '',
		textAlign: 'center',
		verticalAlign: 'middle',
		height: 'medium',
		cta: null,
	},
	displayName: 'Header Banner',
	icon: 'ViewHeadline',
})

export { CnHeaderWidget }
export default CnHeaderWidget
