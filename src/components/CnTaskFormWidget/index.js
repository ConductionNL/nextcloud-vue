/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnTaskFormWidget - self-registers the `task-form` widget type (the form of
 * the flow task a detail page shows, with Save as provisional and Complete)
 * into the shared dashboardWidgetRegistry at module load.
 */

import { lazyComponent } from '../../utils/lazyComponent.js'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

const LazyCnTaskFormWidget = lazyComponent(() => import('./CnTaskFormWidget.vue'), 'CnTaskFormWidget')

registerDashboardWidget('task-form', {
	renderer: LazyCnTaskFormWidget,
	form: null,
	defaultContent: {},
	displayName: 'Task form',
	icon: 'FormSelect',
	surfaces: ['detail-page'],
})

export { default as CnTaskFormWidget } from './CnTaskFormWidget.vue'
export { default } from './CnTaskFormWidget.vue'
