/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnCalendarWidget — self-registers the `calendar` dashboard widget type into
 * the shared dashboardWidgetRegistry at module load.
 *
 * The matching `CnCalendarWidgetForm` is not yet present in this tree, so the
 * entry registers with `form: null` (a renderer-only registration, supported
 * by the registry — such types are excluded from the `CnAddWidgetModal` type
 * picker via `listWidgetTypes()`). When the form lands, wire it in here.
 */

import CnCalendarWidget from './CnCalendarWidget.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('calendar', {
	renderer: CnCalendarWidget,
	form: null,
	defaultContent: {
		viewMode: 'agenda',
		daysAhead: 14,
		colorByCalendar: true,
		internalCalendars: [],
		externalIcsUrls: [],
	},
	displayName: 'Calendar',
	icon: 'Calendar',
})

export { CnCalendarWidget }
export default CnCalendarWidget
