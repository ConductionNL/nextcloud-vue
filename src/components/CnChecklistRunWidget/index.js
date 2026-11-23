/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnChecklistRunWidget — self-registers the `checklist-run` widget type (a
 * checklist answered a page of questions at a time, with a note and photos)
 * into the shared dashboardWidgetRegistry at module load. Renderer only: the
 * questions and where the answers go are declared in the manifest.
 */

import { lazyComponent } from '../../utils/lazyComponent.js'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

const LazyCnChecklistRunWidget = lazyComponent(() => import('./CnChecklistRunWidget.vue'), 'CnChecklistRunWidget')

registerDashboardWidget('checklist-run', {
	renderer: LazyCnChecklistRunWidget,
	form: null,
	defaultContent: {
		questions: { register: '', schema: '', filter: {} },
		pageSize: 1,
	},
	displayName: 'Checklist run',
	icon: 'ClipboardCheckOutline',
	surfaces: ['detail-page', 'app-dashboard'],
})

export { default as CnChecklistRunWidget } from './CnChecklistRunWidget.vue'
export { default } from './CnChecklistRunWidget.vue'
