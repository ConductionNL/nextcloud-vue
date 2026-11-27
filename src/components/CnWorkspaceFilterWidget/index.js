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

import { lazyComponent } from '../../utils/lazyComponent.js'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

const LazyCnWorkspaceFilterWidget = lazyComponent(() => import('./CnWorkspaceFilterWidget.vue'), 'CnWorkspaceFilterWidget')

registerDashboardWidget('workspace-filter', {
	placeholder: 'block',
	renderer: LazyCnWorkspaceFilterWidget,
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

export { default as CnWorkspaceFilterWidget } from './CnWorkspaceFilterWidget.vue'
export { default } from './CnWorkspaceFilterWidget.vue'
