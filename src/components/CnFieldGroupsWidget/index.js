/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnFieldGroupsWidget: self-registers the `field-groups` widget type
 * (several list fields of the current object in one card, as label and value
 * pairs, with one Add menu) into the shared dashboardWidgetRegistry at module
 * load. Renderer only: declared in the manifest.
 */

import { lazyComponent } from '../../utils/lazyComponent.js'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

const LazyCnFieldGroupsWidget = lazyComponent(() => import('./CnFieldGroupsWidget.vue'), 'CnFieldGroupsWidget')

registerDashboardWidget('field-groups', {
	placeholder: 'lines',
	renderer: LazyCnFieldGroupsWidget,
	form: null,
	defaultContent: {
		groups: [],
		readOnly: false,
	},
	displayName: 'Field groups',
	icon: 'CardAccountPhoneOutline',
	surfaces: ['detail-page'],
})

export { default as CnFieldGroupsWidget } from './CnFieldGroupsWidget.vue'
export { default } from './CnFieldGroupsWidget.vue'
