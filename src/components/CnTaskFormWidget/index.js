/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnTaskFormWidget - self-registers the `task-form` widget type (the form of
 * the flow task a detail page shows, with Save as provisional and Complete)
 * into the shared dashboardWidgetRegistry at module load.
 */

import CnTaskFormWidget from './CnTaskFormWidget.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('task-form', {
	renderer: CnTaskFormWidget,
	form: null,
	defaultContent: {},
	displayName: 'Task form',
	icon: 'FormSelect',
	surfaces: ['detail-page'],
})

export { CnTaskFormWidget }
export default CnTaskFormWidget
