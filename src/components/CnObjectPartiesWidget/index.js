/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnObjectPartiesWidget — self-registers the `parties` widget type (a
 * record's parties by role, from OpenRegister's party model) into the shared
 * dashboardWidgetRegistry at module load.
 */

import CnObjectPartiesWidget from './CnObjectPartiesWidget.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('parties', {
	renderer: CnObjectPartiesWidget,
	form: null,
	defaultContent: {},
	displayName: 'Parties',
	icon: 'AccountGroupOutline',
	surfaces: ['detail-page'],
})

export { CnObjectPartiesWidget }
export default CnObjectPartiesWidget
