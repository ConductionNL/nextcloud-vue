/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnSettingsFormWidget — self-registers the `settings-form` widget type (framed
 * inputs for fields of the current object, saved by PATCH of the changed
 * fields) into the shared dashboardWidgetRegistry at module load.
 */

import { lazyComponent } from '../../utils/lazyComponent.js'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

const LazyCnSettingsFormWidget = lazyComponent(() => import('./CnSettingsFormWidget.vue'), 'CnSettingsFormWidget')

registerDashboardWidget('settings-form', {
	renderer: LazyCnSettingsFormWidget,
	form: null,
	defaultContent: {
		fields: [],
		columns: 2,
	},
	displayName: 'Settings form',
	icon: 'FormTextbox',
	surfaces: ['detail-page'],
})

export { default as CnSettingsFormWidget } from './CnSettingsFormWidget.vue'
export { default } from './CnSettingsFormWidget.vue'
