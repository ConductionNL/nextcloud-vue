/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnTextWidget — self-registers the `text` dashboard widget type into the
 * shared dashboardWidgetRegistry at module load.
 */

import CnTextWidget from './CnTextWidget.vue'
import CnTextWidgetForm from '../CnTextWidgetForm/CnTextWidgetForm.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('text', {
	renderer: CnTextWidget,
	form: CnTextWidgetForm,
	// New text widgets default to markdown mode; existing placements without
	// a contentMode key fall through to the renderer's legacy 'html' branch.
	defaultContent: {
		text: '',
		fontSize: '14px',
		color: '',
		backgroundColor: '',
		textAlign: 'left',
		contentMode: 'markdown',
		tableMode: false,
		tableData: null,
	},
	displayName: 'Text',
	icon: 'FormatText',
})

export { CnTextWidget }
export default CnTextWidget
