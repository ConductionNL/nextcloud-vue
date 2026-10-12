/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnRadioCardsWidget — self-registers the `radio-cards` widget type (one
 * choice out of a few cards with a title and a description, bound to an enum
 * field of the current object and saved on selection) into the shared
 * dashboardWidgetRegistry at module load.
 */

import CnRadioCardsWidget from './CnRadioCardsWidget.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('radio-cards', {
	renderer: CnRadioCardsWidget,
	form: null,
	defaultContent: {
		field: '',
		options: [],
	},
	displayName: 'Radio cards',
	icon: 'RadioboxMarked',
	surfaces: ['detail-page'],
})

export { CnRadioCardsWidget }
export default CnRadioCardsWidget
