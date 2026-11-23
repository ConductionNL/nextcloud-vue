/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnObjectPartiesWidget — self-registers the `parties` widget type (a
 * record's parties by role, from OpenRegister's party model) into the shared
 * dashboardWidgetRegistry at module load.
 */

import { lazyComponent } from '../../utils/lazyComponent.js'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

const LazyCnObjectPartiesWidget = lazyComponent(() => import('./CnObjectPartiesWidget.vue'), 'CnObjectPartiesWidget')

registerDashboardWidget('parties', {
	renderer: LazyCnObjectPartiesWidget,
	form: null,
	defaultContent: {},
	displayName: 'Parties',
	icon: 'AccountGroupOutline',
	surfaces: ['detail-page'],
})

export { default as CnObjectPartiesWidget } from './CnObjectPartiesWidget.vue'
export { default } from './CnObjectPartiesWidget.vue'
