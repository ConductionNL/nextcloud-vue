/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnRecordNotesWidget — self-registers the `record-notes` widget type (a
 * text field of the record in view, saved as you type, with an optional
 * outcome select) into the shared dashboardWidgetRegistry at module load.
 * Renderer only: it edits the record in view, so the Add-widget picker does
 * not offer it.
 */

import CnRecordNotesWidget from './CnRecordNotesWidget.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('record-notes', {
	renderer: CnRecordNotesWidget,
	form: null,
	defaultContent: {
		field: 'notes',
	},
	displayName: 'Notes',
	icon: 'NoteEditOutline',
	surfaces: ['detail-page'],
})

export { CnRecordNotesWidget }
export default CnRecordNotesWidget
