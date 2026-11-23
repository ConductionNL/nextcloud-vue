/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnNotepadWidget — self-registers the `notepad` dashboard widget type into
 * the shared dashboardWidgetRegistry at module load.
 */

import { lazyComponent } from '../../utils/lazyComponent.js'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

const LazyCnNotepadWidgetForm = lazyComponent(() => import('../CnNotepadWidgetForm/CnNotepadWidgetForm.vue'), 'CnNotepadWidgetForm')
const LazyCnNotepadWidget = lazyComponent(() => import('./CnNotepadWidget.vue'), 'CnNotepadWidget')

registerDashboardWidget('notepad', {
	renderer: LazyCnNotepadWidget,
	form: LazyCnNotepadWidgetForm,
	// The note is NOT in the placement: it is stored in the reader's preferences.
	defaultContent: { title: '', height: '' },
	displayName: 'Notepad',
	icon: 'NoteEditOutline',
	userAddable: true,
})

export { default as CnNotepadWidget } from './CnNotepadWidget.vue'
export { default } from './CnNotepadWidget.vue'
