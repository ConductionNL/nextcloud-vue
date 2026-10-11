/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnFieldListWidget — self-registers the `field-list` widget type (a list
 * stored inside one field of the current object, shown as rows and edited
 * with one PATCH of that field) into the shared dashboardWidgetRegistry at
 * module load. Renderer only: declared in the manifest.
 */

import CnFieldListWidget from './CnFieldListWidget.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('field-list', {
	renderer: CnFieldListWidget,
	form: null,
	defaultContent: {
		field: '',
		row: {},
		readOnly: false,
	},
	displayName: 'Field list',
	icon: 'FormatListBulleted',
	surfaces: ['detail-page'],
})

export { CnFieldListWidget }
export default CnFieldListWidget
