/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnInteractionFormWidget — self-registers the `interaction-form` dashboard
 * widget type (an active-interaction quick-log form that writes selectedClient /
 * activeSummary into the page workspace context) into the shared
 * dashboardWidgetRegistry at module load. Resolved by its type key via
 * CnDashboardPage's registryRenderer.
 */

import CnInteractionFormWidget from './CnInteractionFormWidget.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('interaction-form', {
	renderer: CnInteractionFormWidget,
	defaultContent: {
		register: 'pipelinq',
		schema: 'contactmoment',
		clientSchema: 'client',
		clientField: 'client',
		summaryField: 'summary',
	},
	displayName: 'Interaction form',
	icon: 'AccountVoice',
})

export { CnInteractionFormWidget }
export default CnInteractionFormWidget
