/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnWorkspaceFilterWidget — self-registers the `workspace-filter` dashboard
 * widget type (a choice list that writes the selected value into the page
 * workspace context so sibling widgets refetch) into the shared
 * dashboardWidgetRegistry at module load. Resolved by its type key via
 * CnDashboardPage's registryRenderer. #91 Wave 3.
 */

import CnWorkspaceFilterWidget from './CnWorkspaceFilterWidget.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('workspace-filter', {
	renderer: CnWorkspaceFilterWidget,
	defaultContent: {
		label: '',
		writes: '@workspace.filter',
		style: 'radio',
		showCounts: true,
		options: [],
	},
	displayName: 'Workspace filter',
	icon: 'FilterVariant',
})

export { CnWorkspaceFilterWidget }
export default CnWorkspaceFilterWidget
