/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnCreateFormWidget — self-registers the `create-form` dashboard widget type
 * (a card that creates one OpenRegister object from manifest-declared fields)
 * into the shared dashboardWidgetRegistry at module load.
 */

import { lazyComponent } from '../../utils/lazyComponent.js'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

const LazyCnCreateFormWidget = lazyComponent(() => import('./CnCreateFormWidget.vue'), 'CnCreateFormWidget')

registerDashboardWidget('create-form', {
	placeholder: 'block',
	renderer: LazyCnCreateFormWidget,
	defaultContent: {
		register: '',
		schema: '',
		fields: [],
	},
	displayName: 'Create form',
	icon: 'FormTextbox',
})

export { default as CnCreateFormWidget } from './CnCreateFormWidget.vue'
export { default } from './CnCreateFormWidget.vue'
