/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnPeopleWidget — self-registers the `people` dashboard widget type into the
 * shared dashboardWidgetRegistry at module load.
 *
 * The matching `CnPeopleWidgetForm` is not yet present in this tree, so the
 * entry registers with `form: null` (a renderer-only registration, supported
 * by the registry — such types are excluded from the `CnAddWidgetModal` type
 * picker via `listWidgetTypes()`). When the form lands, wire it in here.
 */

import CnPeopleWidget from './CnPeopleWidget.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('people', {
	renderer: CnPeopleWidget,
	form: null,
	defaultContent: {
		layout: 'grid',
		filters: [],
		excludeDisabled: true,
		sortBy: 'displayName',
		columns: 4,
	},
	displayName: 'People',
	icon: 'AccountMultiple',
})

export { CnPeopleWidget }
export default CnPeopleWidget
