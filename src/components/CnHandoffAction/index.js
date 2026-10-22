/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnHandoffAction self-registers the `handoff` widget type: hand one record
 * to another app when an endpoint says it can go, and show what came back.
 * Declared in the manifest only, so the Add-widget picker does not offer it.
 */

import CnHandoffAction from './CnHandoffAction.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('handoff', {
	renderer: CnHandoffAction,
	form: null,
	defaultContent: {},
	displayName: 'Handoff',
	icon: 'SendOutline',
	surfaces: ['detail-page'],
})

export { CnHandoffAction }
export default CnHandoffAction
