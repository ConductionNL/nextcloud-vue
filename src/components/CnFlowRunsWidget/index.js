/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnFlowRunsWidget — self-registers the `flow-runs` dashboard widget type (the
 * live flow runs for the viewer's organisation, read from OpenRegister's one
 * flow engine) into the shared dashboardWidgetRegistry at module load. Resolved
 * by its type key from any app's manifest placement; the matching
 * `CnFlowRunsWidgetForm` drives both the `CnAddWidgetModal` create flow and the
 * cog `CnWidgetStyleEditorModal`.
 */

import { lazyComponent } from '../../utils/lazyComponent.js'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

const LazyCnFlowRunsWidgetForm = lazyComponent(() => import('../CnFlowRunsWidgetForm/CnFlowRunsWidgetForm.vue'), 'CnFlowRunsWidgetForm')
const LazyCnFlowRunsWidget = lazyComponent(() => import('./CnFlowRunsWidget.vue'), 'CnFlowRunsWidget')

registerDashboardWidget('flow-runs', {
	placeholder: 'rows',
	renderer: LazyCnFlowRunsWidget,
	form: LazyCnFlowRunsWidgetForm,
	defaultContent: {
		limit: 6,
		pollSeconds: 15,
		rowRoute: '',
		runRoute: '',
		subject: '',
		emptyText: '',
	},
	// What a widget picker's miniature draws with `preview` set: no read, no poll.
	sampleContent: {
		limit: 3,
		pollSeconds: 0,
		sampleRows: [
			{ uuid: 'sample-run-1', flowId: 'sample-flow-1', flowName: 'Permit intake', status: 'running', trigger: 'object.created', startedBy: 'anna', step: 'check-documents', ageMinutes: 4 },
			{ uuid: 'sample-run-2', flowId: 'sample-flow-2', flowName: 'Subsidy decision', status: 'suspended', trigger: 'object.updated', startedBy: 'mark', step: 'await-approval', ageMinutes: 47 },
			{ uuid: 'sample-run-3', flowId: 'sample-flow-3', flowName: 'Invoice reminder', status: 'queued', trigger: 'schedule', startedBy: '', step: '', ageMinutes: 1 },
		],
	},
	displayName: 'Running flows',
	icon: 'Sitemap',
	// Names the sibling-app read this widget depends on: OpenRegister's
	// flow-run surface. A soft hint only — NEVER a manifest.dependencies entry,
	// since an app without OpenRegister simply gets the empty state.
	requires: { graphql: ['openregister:flow-runs'] },
})

export { default as CnFlowRunsWidget } from './CnFlowRunsWidget.vue'
export { default } from './CnFlowRunsWidget.vue'
