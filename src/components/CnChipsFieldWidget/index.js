/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnChipsFieldWidget — self-registers the `chips-field` widget type (a list of
 * short strings in one array field of the current object, added and removed as
 * chips, saved on each change) into the shared dashboardWidgetRegistry.
 */

import CnChipsFieldWidget from './CnChipsFieldWidget.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('chips-field', {
	renderer: CnChipsFieldWidget,
	form: null,
	defaultContent: {
		field: '',
	},
	displayName: 'Chips field',
	icon: 'TagMultiple',
	surfaces: ['detail-page'],
})

export { CnChipsFieldWidget }
export default CnChipsFieldWidget
