/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnCreateFormWidget — self-registers the `create-form` dashboard widget type
 * (a card that creates one OpenRegister object from manifest-declared fields)
 * into the shared dashboardWidgetRegistry at module load.
 */

import CnCreateFormWidget from './CnCreateFormWidget.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('create-form', {
	renderer: CnCreateFormWidget,
	defaultContent: {
		register: '',
		schema: '',
		fields: [],
	},
	displayName: 'Create form',
	icon: 'FormTextbox',
})

export { CnCreateFormWidget }
export default CnCreateFormWidget
