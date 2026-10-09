/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnNotepadWidget — self-registers the `notepad` dashboard widget type into
 * the shared dashboardWidgetRegistry at module load.
 */

import CnNotepadWidgetForm from '../CnNotepadWidgetForm/CnNotepadWidgetForm.vue'
import CnNotepadWidget from './CnNotepadWidget.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('notepad', {
	renderer: CnNotepadWidget,
	form: CnNotepadWidgetForm,
	// The note is NOT in the placement: it is stored in the reader's preferences.
	defaultContent: { title: '', height: '' },
	displayName: 'Notepad',
	icon: 'NoteEditOutline',
	userAddable: true,
})

export { CnNotepadWidget }
export default CnNotepadWidget
