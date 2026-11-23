/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnSwitchRowsWidget — self-registers the `switch-rows` widget type (a card of
 * switches, each with a label and a hint, bound to boolean fields of the
 * current object and saved on toggle) into the shared dashboardWidgetRegistry.
 */

import { lazyComponent } from '../../utils/lazyComponent.js'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

const LazyCnSwitchRowsWidget = lazyComponent(() => import('./CnSwitchRowsWidget.vue'), 'CnSwitchRowsWidget')

registerDashboardWidget('switch-rows', {
	renderer: LazyCnSwitchRowsWidget,
	form: null,
	defaultContent: {
		rows: [],
	},
	displayName: 'Switch rows',
	icon: 'ToggleSwitch',
	surfaces: ['detail-page'],
})

export { default as CnSwitchRowsWidget } from './CnSwitchRowsWidget.vue'
export { default } from './CnSwitchRowsWidget.vue'
