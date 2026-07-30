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

import CnFlowRunsWidget from './CnFlowRunsWidget.vue'
import CnFlowRunsWidgetForm from '../CnFlowRunsWidgetForm/CnFlowRunsWidgetForm.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('flow-runs', {
	renderer: CnFlowRunsWidget,
	form: CnFlowRunsWidgetForm,
	defaultContent: {
		limit: 6,
		pollSeconds: 15,
		rowRoute: '',
		emptyText: '',
	},
	displayName: 'Running flows',
	icon: 'Sitemap',
	// Names the sibling-app read this widget depends on: OpenRegister's
	// flow-run surface. A soft hint only — NEVER a manifest.dependencies entry,
	// since an app without OpenRegister simply gets the empty state.
	requires: { graphql: ['openregister:flow-runs'] },
})

export { CnFlowRunsWidget }
export default CnFlowRunsWidget
