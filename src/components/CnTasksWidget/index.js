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

import { lazyComponent } from '../../utils/lazyComponent.js'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

const LazyCnTasksWidgetForm = lazyComponent(() => import('../CnTasksWidgetForm/CnTasksWidgetForm.vue'), 'CnTasksWidgetForm')
const LazyCnTasksWidget = lazyComponent(() => import('./CnTasksWidget.vue'), 'CnTasksWidget')

registerDashboardWidget('tasks', {
	placeholder: 'rows',
	renderer: LazyCnTasksWidget,
	form: LazyCnTasksWidgetForm,
	defaultContent: {
		scope: 'assigned',
		limit: 6,
		pollSeconds: 30,
		rowRoute: '',
		emptyText: '',
	},
	// What a widget picker's miniature draws with `preview` set: no read, no poll.
	sampleContent: {
		scope: 'assigned',
		limit: 3,
		pollSeconds: 0,
		sampleRows: [
			{ uuid: 'sample-task-1', displayTitle: 'Review permit Dorpsstraat 12', state: 'active', isTerminal: false, priority: 'high', assignee: '', subject: { uuid: 'sample-case-1', title: 'Permit Dorpsstraat 12' }, dueInDays: 1 },
			{ uuid: 'sample-task-2', displayTitle: 'Call back about the subsidy', state: 'active', isTerminal: false, priority: 'normal', assignee: '', subject: { uuid: 'sample-case-2', title: 'Subsidy sports club' }, dueInDays: 3 },
			{ uuid: 'sample-task-3', displayTitle: 'Prepare the council meeting', state: 'available', isTerminal: false, priority: 'normal', assignee: '', subject: null, dueInDays: 6 },
		],
	},
	displayName: 'Tasks',
	icon: 'ClipboardList',
	// Names the sibling-app read this widget depends on: OpenRegister's
	// flow-tasks surface. A soft hint only — NEVER a manifest.dependencies
	// entry, since an app without OpenRegister simply gets the error state.
	requires: { graphql: ['openregister:flow-tasks'] },
})

export { default as CnTasksWidget } from './CnTasksWidget.vue'
export { default } from './CnTasksWidget.vue'
