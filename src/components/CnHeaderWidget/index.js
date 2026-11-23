/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnHeaderWidget — self-registers the `header` dashboard widget type into the
 * shared dashboardWidgetRegistry at module load.
 */

import { lazyComponent } from '../../utils/lazyComponent.js'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

const LazyCnHeaderWidgetForm = lazyComponent(() => import('../CnHeaderWidgetForm/CnHeaderWidgetForm.vue'), 'CnHeaderWidgetForm')
const LazyCnHeaderWidget = lazyComponent(() => import('./CnHeaderWidget.vue'), 'CnHeaderWidget')

registerDashboardWidget('header', {
	renderer: LazyCnHeaderWidget,
	form: LazyCnHeaderWidgetForm,
	defaultContent: {
		title: '',
		subtitle: '',
		backgroundImageUrl: '',
		backgroundImageFileId: null,
		backgroundColor: '',
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

export { default as CnHeaderWidget } from './CnHeaderWidget.vue'
export { default } from './CnHeaderWidget.vue'
