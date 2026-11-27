/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnWorkingCalendarWidget — self-registers the `working-calendar` widget type
 * (one month of a working calendar kept as an OpenRegister object, with its
 * closed dates and Add day) into the shared dashboardWidgetRegistry at module
 * load. Renderer only: the calendar object is named in the manifest.
 */

import { lazyComponent } from '../../utils/lazyComponent.js'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

const LazyCnWorkingCalendarWidget = lazyComponent(() => import('./CnWorkingCalendarWidget.vue'), 'CnWorkingCalendarWidget')

registerDashboardWidget('working-calendar', {
	placeholder: 'block',
	renderer: LazyCnWorkingCalendarWidget,
	form: null,
	defaultContent: {
		calendar: { register: 'flow-timers', schema: 'working-calendar', filter: {} },
	},
	displayName: 'Working calendar',
	icon: 'CalendarMonthOutline',
	surfaces: ['app-dashboard', 'detail-page'],
})

export { default as CnWorkingCalendarWidget } from './CnWorkingCalendarWidget.vue'
export { default } from './CnWorkingCalendarWidget.vue'
