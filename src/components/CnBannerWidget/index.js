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

import CnBannerWidget from './CnBannerWidget.vue'
import CnBannerWidgetForm from '../CnBannerWidgetForm/CnBannerWidgetForm.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('banner', {
	renderer: CnBannerWidget,
	form: CnBannerWidgetForm,
	defaultContent: {
		text: '',
		variant: 'info',
		route: null,
		visibleWhen: null,
	},
	displayName: 'Banner',
	icon: 'AlertCircleOutline',
})

export { CnBannerWidget }
export default CnBannerWidget
