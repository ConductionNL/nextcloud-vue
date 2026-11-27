/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnChecklistWidget — self-registers the `checklist` widget type (the
 * checklist a record carries, ticked in place through the page's record
 * source) into the shared dashboardWidgetRegistry at module load. Renderer
 * only: the items come from the record, so the Add-widget picker does not
 * offer it.
 */

import { lazyComponent } from '../../utils/lazyComponent.js'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

const LazyCnChecklistWidget = lazyComponent(() => import('./CnChecklistWidget.vue'), 'CnChecklistWidget')

registerDashboardWidget('checklist', {
	placeholder: 'rows',
	renderer: LazyCnChecklistWidget,
	form: null,
	defaultContent: {
		path: 'checklist',
	},
	displayName: 'Checklist',
	icon: 'CheckboxMarkedOutline',
	surfaces: ['detail-page'],
})

export { default as CnChecklistWidget } from './CnChecklistWidget.vue'
export { default } from './CnChecklistWidget.vue'
