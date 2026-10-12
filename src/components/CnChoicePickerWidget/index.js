/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnChoicePickerWidget — self-registers the `choice-picker` widget type (choice
 * cards with colour swatches and a state pill, and a confirm-with-warning save)
 * into the shared dashboardWidgetRegistry at module load.
 */

import CnChoicePickerWidget from './CnChoicePickerWidget.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('choice-picker', {
	renderer: CnChoicePickerWidget,
	form: null,
	defaultContent: {
		field: '',
		items: [],
	},
	displayName: 'Choice picker',
	icon: 'Palette',
	surfaces: ['detail-page'],
})

export { CnChoicePickerWidget }
export default CnChoicePickerWidget
