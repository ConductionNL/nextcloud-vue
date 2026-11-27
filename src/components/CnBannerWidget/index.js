/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnBannerWidget — self-registers the `banner` dashboard widget type (a
 * declarative notice banner with variant / text / visibleWhen condition /
 * click-through route) into the shared dashboardWidgetRegistry at module
 * load. Resolved by its type key; not a public export. Configured via
 * `CnBannerWidgetForm`. Also registered in the v2 grid's BUILT_IN_WIDGETS
 * as `widgetKey: "banner"` (see CnWidgetGrid/builtInWidgets.js).
 */

import { lazyComponent } from '../../utils/lazyComponent.js'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

const LazyCnBannerWidgetForm = lazyComponent(() => import('../CnBannerWidgetForm/CnBannerWidgetForm.vue'), 'CnBannerWidgetForm')
const LazyCnBannerWidget = lazyComponent(() => import('./CnBannerWidget.vue'), 'CnBannerWidget')

registerDashboardWidget('banner', {
	placeholder: 'lines',
	renderer: LazyCnBannerWidget,
	form: LazyCnBannerWidgetForm,
	defaultContent: {
		text: '',
		variant: 'info',
		route: null,
		visibleWhen: null,
	},
	displayName: 'Banner',
	icon: 'AlertCircleOutline',
})

export { default as CnBannerWidget } from './CnBannerWidget.vue'
export { default } from './CnBannerWidget.vue'
