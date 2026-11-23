/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnLinkButtonWidget — self-registers the `link` dashboard widget type into
 * the shared dashboardWidgetRegistry at module load.
 */

import { lazyComponent } from '../../utils/lazyComponent.js'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

const LazyCnLinkButtonWidgetForm = lazyComponent(() => import('../CnLinkButtonWidgetForm/CnLinkButtonWidgetForm.vue'), 'CnLinkButtonWidgetForm')
const LazyCnLinkButtonWidget = lazyComponent(() => import('./CnLinkButtonWidget.vue'), 'CnLinkButtonWidget')

registerDashboardWidget('link', {
	renderer: LazyCnLinkButtonWidget,
	form: LazyCnLinkButtonWidgetForm,
	defaultContent: {
		label: '',
		url: '',
		icon: '',
		actionType: 'external',
		backgroundColor: '',
		textColor: '',
		displayMode: 'button',
		listOrientation: 'vertical',
		listItemGap: 'normal',
		links: [],
	},
	displayName: 'Link Button',
	icon: 'LinkVariant',
})

export { default as CnLinkButtonWidget } from './CnLinkButtonWidget.vue'
export { default } from './CnLinkButtonWidget.vue'
