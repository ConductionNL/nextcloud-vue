/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnTasksWidget — self-registers the `tasks` dashboard widget type (the
 * viewer's open tasks, read from OpenRegister's one task inbox) into the
 * shared dashboardWidgetRegistry at module load. Resolved by its type key
 * from any app's manifest placement; the matching `CnTasksWidgetForm`
 * drives both the `CnAddWidgetModal` create flow and the cog
 * `CnWidgetStyleEditorModal`.
 */

import CnTasksWidget from './CnTasksWidget.vue'
import CnTasksWidgetForm from '../CnTasksWidgetForm/CnTasksWidgetForm.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('tasks', {
	renderer: CnTasksWidget,
	form: CnTasksWidgetForm,
	defaultContent: {
		scope: 'assigned',
		limit: 6,
		pollSeconds: 30,
		rowRoute: '',
		emptyText: '',
	},
	displayName: 'Tasks',
	icon: 'ClipboardList',
	// Names the sibling-app read this widget depends on: OpenRegister's
	// flow-tasks surface. A soft hint only — NEVER a manifest.dependencies
	// entry, since an app without OpenRegister simply gets the error state.
	requires: { graphql: ['openregister:flow-tasks'] },
})

export { CnTasksWidget }
export default CnTasksWidget
