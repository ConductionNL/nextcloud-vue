/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnFieldGroupsWidget: self-registers the `field-groups` widget type
 * (several list fields of the current object in one card, as label and value
 * pairs, with one Add menu) into the shared dashboardWidgetRegistry at module
 * load. Renderer only: declared in the manifest.
 */

import CnFieldGroupsWidget from './CnFieldGroupsWidget.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('field-groups', {
	renderer: CnFieldGroupsWidget,
	form: null,
	defaultContent: {
		groups: [],
		readOnly: false,
	},
	displayName: 'Field groups',
	icon: 'CardAccountPhoneOutline',
	surfaces: ['detail-page'],
})

export { CnFieldGroupsWidget }
export default CnFieldGroupsWidget
