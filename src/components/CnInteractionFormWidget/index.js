/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnInteractionFormWidget — self-registers the `interaction-form` dashboard
 * widget type (an active-interaction quick-log form that reads and writes
 * selectedClient / activeSummary in the page workspace context) into the shared
 * dashboardWidgetRegistry at module load. Resolved by its type key via
 * CnDashboardPage's registryRenderer.
 */

import { lazyComponent } from '../../utils/lazyComponent.js'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

const LazyCnInteractionFormWidget = lazyComponent(() => import('./CnInteractionFormWidget.vue'), 'CnInteractionFormWidget')

registerDashboardWidget('interaction-form', {
	placeholder: 'block',
	renderer: LazyCnInteractionFormWidget,
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

export { default as CnInteractionFormWidget } from './CnInteractionFormWidget.vue'
export { default } from './CnInteractionFormWidget.vue'
