/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnChoicePickerWidget — self-registers the `choice-picker` widget type (choice
 * cards with colour swatches and a state pill, and a confirm-with-warning save)
 * into the shared dashboardWidgetRegistry at module load.
 */

import { lazyComponent } from '../../utils/lazyComponent.js'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

const LazyCnChoicePickerWidget = lazyComponent(() => import('./CnChoicePickerWidget.vue'), 'CnChoicePickerWidget')

registerDashboardWidget('choice-picker', {
	placeholder: 'block',
	renderer: LazyCnChoicePickerWidget,
	form: null,
	defaultContent: {
		field: '',
		items: [],
	},
	displayName: 'Choice picker',
	icon: 'Palette',
	surfaces: ['detail-page'],
})

export { default as CnChoicePickerWidget } from './CnChoicePickerWidget.vue'
export { default } from './CnChoicePickerWidget.vue'
