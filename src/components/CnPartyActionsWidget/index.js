/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnPartyActionsWidget — self-registers the `party-actions` widget type (one
 * band of indicators and quick actions on a contact person's or
 * organisation's page) into the shared dashboardWidgetRegistry at module
 * load. Renderer only: the band is declared in the manifest.
 */

import CnPartyActionsWidget from './CnPartyActionsWidget.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('party-actions', {
	renderer: CnPartyActionsWidget,
	form: null,
	defaultContent: {
		indicators: [],
		emptyText: '',
		emptyActions: [],
		actions: [],
	},
	displayName: 'Party actions',
	icon: 'AccountAlertOutline',
	surfaces: ['detail-page'],
})

export { CnPartyActionsWidget }
export default CnPartyActionsWidget
