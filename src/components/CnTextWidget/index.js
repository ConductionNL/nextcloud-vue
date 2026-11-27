/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnTextWidget — self-registers the `text` dashboard widget type into the
 * shared dashboardWidgetRegistry at module load.
 */

import { lazyComponent } from '../../utils/lazyComponent.js'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

const LazyCnTextWidgetForm = lazyComponent(() => import('../CnTextWidgetForm/CnTextWidgetForm.vue'), 'CnTextWidgetForm')
const LazyCnTextWidget = lazyComponent(() => import('./CnTextWidget.vue'), 'CnTextWidget')

registerDashboardWidget('text', {
	placeholder: 'lines',
	renderer: LazyCnTextWidget,
	form: LazyCnTextWidgetForm,
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

export { default as CnTextWidget } from './CnTextWidget.vue'
export { default } from './CnTextWidget.vue'
