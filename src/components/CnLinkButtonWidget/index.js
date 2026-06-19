/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnLinkButtonWidget — self-registers the `link` dashboard widget type into
 * the shared dashboardWidgetRegistry at module load.
 */

import CnLinkButtonWidget from './CnLinkButtonWidget.vue'
import CnLinkButtonWidgetForm from '../CnLinkButtonWidgetForm/CnLinkButtonWidgetForm.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('link', {
	renderer: CnLinkButtonWidget,
	form: CnLinkButtonWidgetForm,
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

export { CnLinkButtonWidget }
export default CnLinkButtonWidget
