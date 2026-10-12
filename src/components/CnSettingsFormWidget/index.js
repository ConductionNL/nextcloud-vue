/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnSettingsFormWidget — self-registers the `settings-form` widget type (framed
 * inputs for fields of the current object, saved by PATCH of the changed
 * fields) into the shared dashboardWidgetRegistry at module load.
 */

import CnSettingsFormWidget from './CnSettingsFormWidget.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('settings-form', {
	renderer: CnSettingsFormWidget,
	form: null,
	defaultContent: {
		fields: [],
		columns: 2,
	},
	displayName: 'Settings form',
	icon: 'FormTextbox',
	surfaces: ['detail-page'],
})

export { CnSettingsFormWidget }
export default CnSettingsFormWidget
